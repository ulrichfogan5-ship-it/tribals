// ==UserScript==
// @name Tribals.io Proximity Radar & Distance Alert (Long Range) 🌴
// @namespace http://tampermonkey.net/
// @version 1.2.0
// @description Long-range proximity detector with distance tracking and LED indicator
// @author You
// @match https://tribals.io/*
// @icon https://www.google.com/s2/favicons?sz=64&domain=tribals.io
// @grant unsafeWindow
// @run-at document-end
// ==/UserScript==

(function() {
    'use strict';

    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    win.tribalsRadar = {
        alertDistance: 70 // <-- MODIFIEZ CE CHIFFRE ICI (en mètres) pour changer la distance d'alerte
    };

    /* Interface Graphique (GUI) */
    function initializeUI() {
        if (document.getElementById('tribals-radar-gui')) return;

        const style = document.createElement('style');
        style.textContent = `
            #tribals-radar-gui {
                position: absolute;
                top: 150px;
                right: 20px;
                z-index: 99999;
                font-family: Arial, sans-serif;
                background-color: rgba(15, 15, 15, 0.9);
                border: 1px solid #444;
                border-radius: 8px;
                color: #fff;
                width: 250px;
                user-select: none;
                box-shadow: 0 4px 15px rgba(0,0,0,0.6);
            }
            .radar-header {
                padding: 10px;
                background: rgba(0, 255, 0, 0.15);
                border-bottom: 1px solid #444;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
                font-weight: bold;
                font-size: 13px;
                color: #00ff00;
                text-align: center;
            }
            .radar-body {
                padding: 12px;
                font-size: 13px;
            }
            .radar-status-box {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: rgba(0,0,0,0.5);
                padding: 8px 10px;
                border-radius: 6px;
                border: 1px solid #555;
            }
            .radar-led {
                width: 14px;
                height: 14px;
                border-radius: 50%;
                background-color: #555;
                box-shadow: 0 0 5px #222;
                transition: background-color 0.2s, box-shadow 0.2s;
            }
            .radar-led.active {
                background-color: #00ff00;
                box-shadow: 0 0 10px #00ff00, 0 0 20px #00ff00;
                animation: pulse-led 0.8s infinite alternate;
            }
            @keyframes pulse-led {
                0% { transform: scale(1); }
                100% { transform: scale(1.2); }
            }
            .radar-distance-text {
                font-weight: bold;
                font-size: 12px;
                color: #ccc;
            }
        `;
        document.head.appendChild(style);

        const uiDiv = document.createElement('div');
        uiDiv.id = 'tribals-radar-gui';
        uiDiv.innerHTML = `
            <div class="radar-header">Radar Proximité Ennemi (70m)</div>
            <div class="radar-body">
                <div class="radar-status-box">
                    <span id="radar-text" class="radar-distance-text">Recherche des joueurs...</span>
                    <div id="radar-led" class="radar-led"></div>
                </div>
            </div>
        `;
        document.body.appendChild(uiDiv);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeUI);
    } else {
        initializeUI();
    }

    /* Boucle de calcul de proximité longue portée */
    function radarLoop() {
        const led = document.getElementById('radar-led');
        const text = document.getElementById('radar-text');

        if (led && text) {
            let foundPlayer = false;
            let closestDist = Infinity;
            let closestName = '';

            if (win.tribals && win.tribals.players && win.tribals.players.length > 0 && win.tribals.localPlayer) {
                const localPos = win.tribals.localPlayer.entity && win.tribals.localPlayer.entity.position ? win.tribals.localPlayer.entity.position : null;

                if (localPos) {
                    win.tribals.players.forEach(plr => {
                        if (!plr.obj || plr.obj === win.tribals.localPlayer || !plr.obj.entity || !plr.obj.entity.position) return;
                        const enemyPos = plr.obj.entity.position;

                        const dist = Math.hypot(
                            enemyPos.x - localPos.x,
                            enemyPos.y - localPos.y,
                            enemyPos.z - localPos.z
                        );

                        if (dist < closestDist) {
                            closestDist = dist;
                            closestName = plr.username || 'Ennemi';
                            foundPlayer = true;
                        }
                    });
                }
            }

            if (foundPlayer && closestDist <= win.tribalsRadar.alertDistance) {
                led.classList.add('active');
                text.innerHTML = `<span style="color:#00ff00;">${closestName}</span> à <strong style="color:#fff;">${Math.round(closestDist)}m</strong>`;
            } else if (foundPlayer) {
                led.classList.remove('active');
                text.innerHTML = `Plus proche: ${Math.round(closestDist)}m`;
            } else {
                led.classList.remove('active');
                text.innerHTML = `Aucun ennemi dans les ${win.tribalsRadar.alertDistance}m`;
            }
        }

        setTimeout(radarLoop, 250);
    }

    radarLoop();
})();