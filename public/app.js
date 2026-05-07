/* ==========================================================================
   APP STATE & STATIC CONSTANTS
   ========================================================================== */
const API_BASE_URL = window.location.origin;

// State tracking
let currentTrackId = '6Uj1ctrBOjOas8xZXGqKk4';
let activeSnippetLang = 'curl';
let lastFetchedData = null;

// Preset tracking fallback info
const trackInfoMap = {
    '6Uj1ctrBOjOas8xZXGqKk4': { title: 'Woman', artist: 'Doja Cat' },
    '3OHfY25tqY28d16oZczHc8': { title: 'Kill Bill', artist: 'SZA' },
    '6qYkmqFsXbj8CQjAdbYz07': { title: 'Blinding Lights', artist: 'The Weeknd' },
    '6dOtVTDdiauQNBQEDOtlAB': { title: 'Birds of a Feather', artist: 'Billie Eilish' },
    '2qSkIjg1o9h3YT9RAgYN75': { title: 'Espresso', artist: 'Sabrina Carpenter' }
};

// Snippet templates generator
const snippetTemplates = {
    curl: (trackId) => `curl -X GET "${API_BASE_URL}/api/canvas?trackId=${trackId}"`,
    js: (trackId) => `fetch("${API_BASE_URL}/api/canvas?trackId=${trackId}")
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error("Error:", error));`,
    python: (trackId) => `import requests

url = "${API_BASE_URL}/api/canvas"
params = {"trackId": "${trackId}"}

response = requests.get(url, params=params)
if response.status_code == 200:
    data = response.json()
    print(data)
else:
    print(f"Error: {response.status_code}")`,
    node: (trackId) => `const axios = require('axios');

axios.get('${API_BASE_URL}/api/canvas', {
    params: { trackId: '${trackId}' }
})
.then(response => {
    console.log(response.data);
})
.catch(error => {
    console.error('Error fetching canvas:', error);
});`
};

/* ==========================================================================
   DOM ELEMENTS SELECTORS
   ========================================================================== */
const elTrackInput = document.getElementById('track-id-input');
const elBtnFetch = document.getElementById('btn-fetch');
const elLiveUrlDisplay = document.getElementById('live-url-display');
const elSnippetCodeBlock = document.getElementById('snippet-code-block');
const elJsonOutputBlock = document.getElementById('json-output-block');

// Player elements
const elPlayerVideo = document.getElementById('player-canvas-video');
const elVideoErrorPlaceholder = document.querySelector('.canvas-error-placeholder');
const elPlayerTrackName = document.getElementById('player-track-name');
const elPlayerArtistName = document.getElementById('player-artist-name');
const elPlayerPlayBtn = document.getElementById('player-btn-play');
const elIphoneMockup = document.querySelector('.iphone-mockup');

// Copy & Toast elements
const elToast = document.getElementById('toast');
const elToastMessage = document.getElementById('toast-message');
const elBtnCopyUrl = document.getElementById('btn-copy-url');
const elBtnCopySnippet = document.getElementById('btn-copy-snippet');
const elBtnCopyJson = document.getElementById('btn-copy-json');

/* ==========================================================================
   INITIALIZATION & STARTUP
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    // Start up Lucide Icons
    lucide.createIcons();
    
    // Wire up events
    setupTabToggles();
    setupPresetChips();
    setupCopyHandlers();
    setupPlayerLogic();
    
    // Live update snippets on keyup
    elTrackInput.addEventListener('input', (e) => {
        let val = e.target.value.trim();
        if (val.startsWith('spotify:track:')) {
            val = val.split(':').pop();
        }
        currentTrackId = val || '6Uj1ctrBOjOas8xZXGqKk4';
        updateInteractiveElements();
    });
    
    elBtnFetch.addEventListener('click', fetchCanvasData);

    // Run first initial fetch automatically so user sees something stunning
    fetchCanvasData();
});

/* ==========================================================================
   CORE UTILITY FUNCTIONS
   ========================================================================== */

/**
 * Perform custom JSON Regex-based syntax highlighting
 */
function syntaxHighlight(json) {
    if (typeof json !== 'string') {
        json = JSON.stringify(json, null, 2);
    }
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
        let cls = 'json-number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'json-key';
            } else {
                cls = 'json-string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
        } else if (/null/.test(match)) {
            cls = 'json-null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

/**
 * Show a quick micro toast notification
 */
function showToast(message, isSuccess = true) {
    elToastMessage.textContent = message;
    
    // Toggle icon
    const elIcon = elToast.querySelector('.toast-icon');
    if (isSuccess) {
        elIcon.setAttribute('data-lucide', 'check');
        elIcon.style.color = 'var(--accent)';
        elToast.style.borderColor = 'var(--accent)';
    } else {
        elIcon.setAttribute('data-lucide', 'alert-circle');
        elIcon.style.color = '#f43f5e';
        elToast.style.borderColor = '#f43f5e';
    }
    
    lucide.createIcons();
    
    elToast.classList.remove('hidden');
    
    setTimeout(() => {
        elToast.classList.add('hidden');
    }, 2800);
}

/**
 * Handle copy to clipboard operations safely
 */
function copyTextToClipboard(text, successMsg) {
    if (!navigator.clipboard) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
            showToast(successMsg);
        } catch (err) {
            showToast('Fallback copy failed', false);
        }
        document.body.removeChild(textArea);
        return;
    }
    
    navigator.clipboard.writeText(text)
        .then(() => showToast(successMsg))
        .catch(() => showToast('Copying failed', false));
}

/**
 * Synchronize snippets and URL display cards when values change
 */
function updateInteractiveElements() {
    // URL displays
    const fullUrl = `${API_BASE_URL}/api/canvas?trackId=${currentTrackId}`;
    elLiveUrlDisplay.textContent = fullUrl;
    
    // Code snippet update
    if (snippetTemplates[activeSnippetLang]) {
        elSnippetCodeBlock.textContent = snippetTemplates[activeSnippetLang](currentTrackId);
    }
}

/* ==========================================================================
   TAB TOGGLES & TRIGGERS CONFIG
   ========================================================================== */
function setupTabToggles() {
    // 1. Display Pane switching (Spotify Phone vs JSON Code)
    document.querySelectorAll('.display-tab').forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
            const container = tabBtn.parentElement;
            container.querySelectorAll('.display-tab').forEach(b => b.classList.remove('active'));
            tabBtn.classList.add('active');
            
            const targetId = tabBtn.getAttribute('data-target');
            const paneContainer = container.nextElementSibling;
            paneContainer.querySelectorAll('.display-pane').forEach(p => p.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });

    // 2. Auth guide card vertical tabs switcher
    document.querySelectorAll('.auth-step-indicator').forEach(stepBtn => {
        stepBtn.addEventListener('click', () => {
            const sidebar = stepBtn.parentElement;
            sidebar.querySelectorAll('.auth-step-indicator').forEach(b => b.classList.remove('active'));
            stepBtn.classList.add('active');
            
            const stepNum = stepBtn.getAttribute('data-step');
            const contentWrap = sidebar.nextElementSibling;
            contentWrap.querySelectorAll('.auth-step-content').forEach(p => p.classList.remove('active'));
            document.getElementById(`auth-step-${stepNum}`).classList.add('active');
        });
    });

    // 3. Self hosting guide shell window switching
    document.querySelectorAll('.terminal-tab').forEach(termBtn => {
        termBtn.addEventListener('click', () => {
            const header = termBtn.parentElement;
            header.querySelectorAll('.terminal-tab').forEach(b => b.classList.remove('active'));
            termBtn.classList.add('active');
            
            const targetPaneId = termBtn.getAttribute('data-target');
            const body = header.nextElementSibling;
            body.querySelectorAll('.terminal-pane').forEach(p => p.classList.remove('active'));
            document.getElementById(targetPaneId).classList.add('active');
        });
    });

    // 4. Code Snippet Language switcher
    document.querySelectorAll('.snippet-tab').forEach(snBtn => {
        snBtn.addEventListener('click', () => {
            const tabsWrap = snBtn.parentElement;
            tabsWrap.querySelectorAll('.snippet-tab').forEach(b => b.classList.remove('active'));
            snBtn.classList.add('active');
            
            activeSnippetLang = snBtn.getAttribute('data-lang');
            updateInteractiveElements();
        });
    });

    // 5. Documentation Sidebar highlighted items matching
    document.querySelectorAll('.sidebar-link').forEach(sideLink => {
        sideLink.addEventListener('click', (e) => {
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            sideLink.classList.add('active');
        });
    });
}

/* ==========================================================================
   PRESET CHIPS MANAGEMENT
   ========================================================================== */
function setupPresetChips() {
    document.querySelectorAll('.preset-chips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.preset-chips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            const id = chip.getAttribute('data-track-id');
            elTrackInput.value = id;
            currentTrackId = id;
            
            updateInteractiveElements();
            
            // Automatically trigger load fetch
            fetchCanvasData();
        });
    });
}

/* ==========================================================================
   CLIPBOARD HANDLERS INTERACTION
   ========================================================================== */
function setupCopyHandlers() {
    // Copy Live API Request URL
    elBtnCopyUrl.addEventListener('click', () => {
        const urlStr = `${API_BASE_URL}/api/canvas?trackId=${currentTrackId}`;
        copyTextToClipboard(urlStr, 'API Request URL copied to clipboard!');
    });

    // Copy Implementation Code Block
    elBtnCopySnippet.addEventListener('click', () => {
        const snippetText = elSnippetCodeBlock.textContent;
        copyTextToClipboard(snippetText, 'Code snippet copied to clipboard!');
    });

    // Copy Resulting JSON
    elBtnCopyJson.addEventListener('click', () => {
        if (!lastFetchedData) {
            showToast('No JSON response available to copy yet', false);
            return;
        }
        const jsonStr = JSON.stringify(lastFetchedData, null, 2);
        copyTextToClipboard(jsonStr, 'Response JSON copied to clipboard!');
    });

    // Copy block utilities in manual documentation
    document.querySelectorAll('.btn-copy-box').forEach(btn => {
        btn.addEventListener('click', () => {
            const textToCopy = btn.getAttribute('data-copy');
            copyTextToClipboard(textToCopy, 'Copied successfully!');
        });
    });
}

/* ==========================================================================
   SPOTIFY PLAYER SIMULATION HANDLERS
   ========================================================================== */
function setupPlayerLogic() {
    elPlayerPlayBtn.addEventListener('click', () => {
        if (elPlayerVideo.paused) {
            elPlayerVideo.play()
                .then(() => {
                    elIphoneMockup.classList.remove('paused');
                    elPlayerPlayBtn.innerHTML = '<i data-lucide="pause"></i>';
                    lucide.createIcons();
                })
                .catch(() => showToast('Failed to resume canvas playback', false));
        } else {
            elPlayerVideo.pause();
            elIphoneMockup.classList.add('paused');
            elPlayerPlayBtn.innerHTML = '<i data-lucide="play"></i>';
            lucide.createIcons();
        }
    });
}

/* ==========================================================================
   SERVER AJAX CALL HANDLER
   ========================================================================== */
async function fetchCanvasData() {
    const trackVal = elTrackInput.value.trim();
    if (!trackVal) {
        showToast('Please enter a track ID or URI', false);
        return;
    }
    
    // Clear prefixes if pasted as URI
    let trackIdClean = trackVal;
    if (trackIdClean.startsWith('spotify:track:')) {
        trackIdClean = trackIdClean.split(':').pop();
    }
    
    currentTrackId = trackIdClean;
    updateInteractiveElements();
    
    // Toggle Loading Status
    elBtnFetch.disabled = true;
    elBtnFetch.querySelector('.btn-text').textContent = 'Fetching...';
    elBtnFetch.querySelector('.spinner').classList.remove('hidden');
    elJsonOutputBlock.textContent = 'Contacting server microservices...';
    
    try {
        const queryUrl = `/api/canvas?trackId=${currentTrackId}`;
        const response = await fetch(queryUrl);
        
        if (!response.ok) {
            const errorPayload = await response.json().catch(() => ({}));
            throw new Error(errorPayload.error || `HTTP error! Status: ${response.status}`);
        }
        
        const payload = await response.json();
        lastFetchedData = payload;
        
        // Render raw syntax highlighted JSON
        elJsonOutputBlock.innerHTML = syntaxHighlight(payload);
        
        // Inject results into mockup player
        const canvasList = payload.canvasesList;
        if (canvasList && canvasList.length > 0) {
            const canvasObj = canvasList[0];
            const canvasUrl = canvasObj.canvasUrl;
            
            // Render details
            elVideoErrorPlaceholder.classList.add('hidden');
            elPlayerVideo.classList.remove('hidden');
            elPlayerVideo.src = canvasUrl;
            
            // Try playing
            elPlayerVideo.play()
                .then(() => {
                    elIphoneMockup.classList.remove('paused');
                    elPlayerPlayBtn.innerHTML = '<i data-lucide="pause"></i>';
                    lucide.createIcons();
                })
                .catch(() => {
                    console.log('Autoplay blocked or video loading failed.');
                });
            
            // Try updating Metadata if returned, otherwise fallback to local map
            if (canvasObj.artist && canvasObj.artist.artistName) {
                // Spotify returns names in its canvas protobuf response!
                elPlayerArtistName.textContent = canvasObj.artist.artistName;
                
                // Track name is not inside canvas payload usually, check fallback map or search trackId
                const fallbackInfo = trackInfoMap[currentTrackId];
                if (fallbackInfo) {
                    elPlayerTrackName.textContent = fallbackInfo.title;
                } else {
                    elPlayerTrackName.textContent = 'Spotify Track';
                }
            } else {
                // Pull from preset map fallback
                const fallbackInfo = trackInfoMap[currentTrackId];
                if (fallbackInfo) {
                    elPlayerTrackName.textContent = fallbackInfo.title;
                    elPlayerArtistName.textContent = fallbackInfo.artist;
                } else {
                    elPlayerTrackName.textContent = 'Spotify Track';
                    elPlayerArtistName.textContent = 'Unknown Artist';
                }
            }
            
            showToast('Canvas fetched successfully!');
        } else {
            // Success response but no canvas list found
            elPlayerVideo.src = '';
            elPlayerVideo.classList.add('hidden');
            elVideoErrorPlaceholder.classList.remove('hidden');
            
            elPlayerTrackName.textContent = 'Track';
            elPlayerArtistName.textContent = 'No Canvas Available';
            elIphoneMockup.classList.add('paused');
            
            showToast('No Canvas loop video associated with this track.', false);
        }
        
    } catch (error) {
        console.error('API Fetch failed:', error);
        
        // Render error JSON
        const errJsonObj = { error: error.message || 'Unknown network error' };
        elJsonOutputBlock.innerHTML = syntaxHighlight(errJsonObj);
        
        // Put player in failed state
        elPlayerVideo.src = '';
        elPlayerVideo.classList.add('hidden');
        elVideoErrorPlaceholder.classList.remove('hidden');
        
        elPlayerTrackName.textContent = 'Error';
        elPlayerArtistName.textContent = 'Fetch Failed';
        elIphoneMockup.classList.add('paused');
        
        showToast(`Fetch failed: ${error.message}`, false);
    } finally {
        // Reset fetch button
        elBtnFetch.disabled = false;
        elBtnFetch.querySelector('.btn-text').textContent = 'Fetch Canvas';
        elBtnFetch.querySelector('.spinner').classList.add('hidden');
    }
}
