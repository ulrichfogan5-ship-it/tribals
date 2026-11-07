// ==UserScript==
// @name         walk on water potato
// @namespace    potato
// @version      1.5
// @description  walk on water script by potato
// @match        https://tribals.io/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    let platform = null;
    let active = false;
    let pcApp = null;
    let btn = null;

    // Capture the PlayCanvas application
    Object.defineProperty(window, "pc", {
        set(v){
            if(!pcApp) {
                pcApp = v;
                checkAppReady();
            }
        },
        get(){ return pcApp; }
    });

    function checkAppReady() {
        const readyCheck = setInterval(() => {
            if (pcApp?.app?.root && document.body) {
                clearInterval(readyCheck);
                createButton();
                injectStyles();
            }
        }, 500);
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .wow-button {
                position: fixed;
                top: 300px;
                left: 20px;
                z-index: 999999;
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 14px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                letter-spacing: 0.3px;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .wow-button.off {
                background: linear-gradient(135deg, #2c3e50, #1e2a36);
                color: #7f8c8d;
                border-left: 3px solid #3498db;
            }

            .wow-button.on {
                background: linear-gradient(135deg, #1e4b3c, #0d3629);
                color: #2ecc71;
                border-left: 3px solid #2ecc71;
                box-shadow: 0 4px 15px rgba(46, 204, 113, 0.3);
            }

            .wow-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2);
            }

            .wow-button:active {
                transform: translateY(0px);
            }

            .wow-icon {
                font-size: 18px;
            }

            .wow-status {
                font-size: 11px;
                opacity: 0.8;
                margin-left: 4px;
            }

            .wow-credit {
                position: fixed;
                top: 360px;
                left: 20px;
                font-size: 10px;
                color: rgba(255, 255, 255, 0.3);
                font-family: monospace;
                z-index: 999998;
                pointer-events: none;
                letter-spacing: 1px;
            }
        `;
        document.head.appendChild(style);
    }

    function createButton() {
        btn = document.createElement('button');
        btn.className = 'wow-button off';

        // Inner HTML with icon and status
        btn.innerHTML = `
            <span class="wow-icon">🌊</span>
            <span>Walk On Water</span>
            <span class="wow-status">OFF</span>
        `;

        btn.onclick = toggleWalkOnWater;
        document.body.appendChild(btn);

        // Add credit text
        const credit = document.createElement('div');
        credit.className = 'wow-credit';
        credit.textContent = 'by potato';
        document.body.appendChild(credit);
    }

    function toggleWalkOnWater() {
        if (!pcApp?.app?.root) {
            // Simple alert if game not ready
            btn.style.background = 'linear-gradient(135deg, #c0392b, #962d22)';
            btn.style.color = '#fff';
            setTimeout(() => {
                updateButtonState(active);
            }, 200);
            return;
        }

        active = !active;

        if (active) {
            // Clean up old platform
            if (platform && !platform.destroyed) {
                platform.destroy();
            }

            try {
                // Create invisible platform
                platform = new pcApp.Entity();
                pcApp.app.root.addChild(platform);

                // Add collision only - no visual model
                platform.addComponent('collision', {
                    type: 'box',
                    halfExtents: new pcApp.Vec3(500, 0.1, 500)
                });

                platform.addComponent('rigidbody', {
                    type: 'static'
                });

                platform.setPosition(0, 3.0, 0);

                updateButtonState(true);

            } catch (error) {
                console.error('Failed:', error);
                active = false;
            }
        } else {
            if (platform && !platform.destroyed) {
                platform.destroy();
                platform = null;
            }
            updateButtonState(false);
        }
    }

    function updateButtonState(isActive) {
        if (!btn) return;

        btn.className = `wow-button ${isActive ? 'on' : 'off'}`;
        btn.innerHTML = `
            <span class="wow-icon">🌊</span>
            <span>Walk On Water</span>
            <span class="wow-status">${isActive ? 'ON' : 'OFF'}</span>
        `;
    }

    // Clean up
    window.addEventListener('beforeunload', () => {
        if (platform && !platform.destroyed) {
            platform.destroy();
        }
    });

})();