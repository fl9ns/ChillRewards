// ==UserScript==
// @name         Chill Rewards
// @version      0.1.1
// @description  Chill Rewards
// @author       FL9NS
// @match        https://www.twitch.tv/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitch.tv
// ==/UserScript==

(function() {
    'use strict';

    function flouns_frInt(number) { return new Intl.NumberFormat('fr-FR').format(number); }
    function flouns_uid() { return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16) ); }
    function flouns_getToken() {
        if(document?.cookie?.split("; ")?.find(item=>item?.startsWith("auth-token="))?.split("=")[1]) {
            return document.cookie.split("; ").find(item=>item.startsWith("auth-token="))?.split("=")[1];
        } else {
            return null;
        }
    }
    
    // Init
    const flouns_version = `0,1.1`;
    const flouns_authToken = flouns_getToken();
    const flouns_clientID = 'kimne78kx3ncx6brgo4mv6wki5h1ko';
    let flouns_rewards = [];
    let flouns_channel = '';
    let flouns_channelID = -1;

    function flouns_getRewards() {
        flouns_channel = location.href.substring(location.href.lastIndexOf('/')+1).replace(`?referrer=raid`,``);
        return new Promise(resolve => {
            fetch(`https://gql.twitch.tv/gql#origin=twilight`, {
                method: "POST",
                headers: {
                    "Authorization": `OAuth ${flouns_authToken}`,
                    "Client-Id": `${flouns_clientID}`,
                    "Content-Type": `application/json`
                },
                body: JSON.stringify(
                    [
                        {
                            "operationName":"ChannelPointsContext",
                            "variables":{
                                "channelLogin":`${flouns_channel}`,
                                "includeGoalTypes":["CREATOR","BOOST"]
                            },
                            "extensions":{
                                "persistedQuery":{
                                    "version":1,
                                    "sha256Hash":"374314de591e69925fce3ddc2bcf085796f56ebb8cad67a0daa3165c03adc345"
                                }
                            }
                        }
                    ]
                )
            })
            .then(res => {
                if(res.ok) { return res.json();  }
                else { throw new Error(`Chill Rewards | erreur HTTP: ${res.status}`); }
            })
            .then(data => {
                const test = data[0]?.data?.community?.channel?.communityPointsSettings?.customRewards;
                if(test) {
                    flouns_channelID = data[0].data.community.channel.id;
                    resolve(data[0].data.community.channel.communityPointsSettings.customRewards);
                } else {
                    console.error('Chill Rewards | erreur lors du fetch GQL #1 :', error);
                    resolve(false);
                }
                
            })
            .catch(error => {
                console.error('Chill Rewards | erreur lors du fetch GQL #2 :', error);
                resolve(false);
            })
        });
    }

    function flouns_sendReward(cost, prompt, id, title) {
        return new Promise(resolve => {
            fetch(`https://gql.twitch.tv/gql#origin=twilight`, {
                method: "POST",
                headers: {
                    "Authorization": `OAuth ${flouns_authToken}`,
                    "Client-Id": `${flouns_clientID}`,
                    "Content-Type": `application/json`
                },
                body: JSON.stringify(
                    [
                        {
                            "operationName":"RedeemCustomReward",
                            "variables":{
                                "input":{
                                    "channelID":`${flouns_channelID}`,
                                    "cost":cost,
                                    "prompt":prompt,
                                    "rewardID":`${id}`,
                                    "title":`${title}`,
                                    "transactionID":`${flouns_uid()}`
                                }
                            },
                            "extensions":{
                                "persistedQuery":{
                                    "version":1,
                                    "sha256Hash":"d56249a7adb4978898ea3412e196688d4ac3cea1c0c2dfd65561d229ea5dcc42"
                                }
                            }
                        }
                    ]
                )
            })
            .then( (res) => {
                if(res.status === 200) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            })
            .catch(e => {
                resolve(false);
            })
        })
    }

    async function flouns_injectHTML() {

        const buttonAlreadyInejcted = document?.getElementById('flouns_button');
        const panelAlreadyInejcted = document?.getElementById('flouns_panel');

        // NEED INJECT
        if(!buttonAlreadyInejcted && !panelAlreadyInejcted) {

            // target exist
            if(document?.getElementsByClassName('chat-input__buttons-container')[0]) {

                // Target & child
                const buttonsContainer = document.getElementsByClassName("chat-input__buttons-container")[0];
                const divs = Array.from(buttonsContainer.children).filter(e => e.tagName === "DIV");
                if(divs[1]?.children) {

                    // Reset channel infos
                    flouns_rewards = [];    // edited next step (parse rewards)
                    flouns_channel = '';    // edited by flouns_getRewards()
                    flouns_channelID = -1;  // edited by flouns_getRewards()

                    // Button
                    const button = document.createElement('div');
                    button.id = 'flouns_button';
                    const img = document.createElement('img');
                    img.src = 'https://static-cdn.jtvnw.net/custom-reward-images/default-1.png';
                    button.appendChild(img);

                    // INJECT Button
                    divs[1].prepend(button);

                    // Panel
                    const panel = document.createElement('div');
                    panel.id = 'flouns_panel';
                    panel.style.display = 'none';

                    
                    // Reload button
                    const reload = document.createElement('div');
                    reload.id = 'flouns_reload';
                    reload.title = `Actualiser`;
                    reload.textContent = `🗘`;
                    panel.appendChild(reload);
                    

                    // Rewards
                    let rewards = await flouns_getRewards();
                    let rewardsTotal = 0;
                    rewards.sort((a, b) => a.cost - b.cost);
                    rewards.forEach(r => {

                        // No input, no pause, enable
                        if(!r.isUserInputRequired && !r.isPaused && r.isEnabled) {

                            rewardsTotal++;
                            flouns_rewards.push(r);

                            // Reward BLOC
                            const reward = document.createElement('div');
                            reward.id = `${r.id}`;
                            reward.className = 'flouns_reward';
                            reward.title = `${r.title}`;
                            reward.style.backgroundColor = `${r.backgroundColor}`;

                            // Reward TITLE
                            const title = document.createElement('div');
                            title.className = 'flouns_rewardTitle';
                            title.textContent = `${r.title}`;
                            reward.appendChild(title);

                            // Reward IMAGE
                            const img = document.createElement('img');
                            img.className = 'flouns_rewardImage';
                            let image = '';
                            if(r.image === null) { image = 'https://static-cdn.jtvnw.net/custom-reward-images/default-1.png'; }
                            else { image = r.image.url; }
                            img.src = `${image}`;
                            reward.appendChild(img);

                            // Reward COST
                            const cost = document.createElement('div');
                            cost.className = 'flouns_rewardCost';
                            cost.textContent = `${flouns_frInt(r.cost)}`;
                            reward.appendChild(cost);

                            // Reward INJECT
                            panel.appendChild(reward);
                        }
                    });

                    // No rewards
                    if(rewardsTotal === 0) {
                        const img = document.createElement('img');
                        img.src = `https://assets.twitch.tv/assets/clips-no-search-results-7d4ef25b744861e39cb7.png`;
                        img.alt = `pas de récompense...`;
                        img.style.opacity = `0.3`;
                        panel.appendChild(img);
                    }

                    // Version
                    const version = document.createElement('div');
                    version.id = 'flouns_version';
                    version.textContent = `Chill Rewards ${flouns_version} - FL9NS`;
                    panel.appendChild(version);

                    // INJECT Panel
                    divs[0].prepend(panel);

                    // Button panel
                    button.addEventListener('click', () => {
                        if(panel.style.display === 'none') {
                            flouns_adjustPanel();
                            panel.style.display = 'block';
                            document.getElementById('flouns_button').classList.add('flouns_buttonActive');
                        } else {
                            panel.style.display = 'none';
                            document.getElementById('flouns_button').classList.remove('flouns_buttonActive');
                        }
                    });

                    // Button reload (refresh panel)
                    reload.addEventListener('click', () => {
                        if(panel) { panel.remove(); }
                        if(button) { button.remove(); }
                    });
                }

                // EVENT Rewards CLICK
                flouns_rewards.forEach(r => {
                    document.getElementById(r.id).addEventListener('click', () => {
                        flouns_sendReward(r.cost, r.prompt, r.id, r.title);
                    });
                });
            }
        }
    }

    function flouns_injectCSS() {
        const style = document.createElement('style');
        style.textContent = `
            #flouns_button {
                width: 30px;
                height: 30px;
                cursor: pointer;
                border-radius: 4px;
            }
            #flouns_button:hover {
                background-color: #9147ff;
            }
            #flouns_button img {
                width: 20px;
                margin: 5px;
                height: 20px;
            }
            #flouns_panel {
                color: #AAA;
                bottom: 90px;
                width: 320px;
                padding: 5px;
                font-size: 14px;
                z-index: 9999999;
                font-weight: 400;
                user-select: none;
                font-style: normal;
                position: absolute;
                overflow-y: scroll;
                overflow-x: hidden;
                border-radius: 4px;
                background-color: #000;
                border: 1px solid #9147ff;
                font-family: "Ubuntu", sans-serif;
            }
            .flouns_buttonActive {
                background-color: #9147ff;
            }
            .flouns_reward {
                color: #FFF;
                float: left;
                width: 92px;
                margin: 5px;
                height: 92px;
                cursor: pointer;
                border-radius: 4px;
                border: 1px solid #999;
            }
            .flouns_reward:hover {
                border: 1px solid #DDD;
                box-shadow: 0px 0px 5px #FFF;
            }
            .flouns_reward:active {
                opacity: 0.3;
            }
            .flouns_rewardTitle {
                width: 90px;
                font-size: 14px;
                padding: 0px 1px;
                overflow: hidden;
                max-height: 40px;
                line-height: 20px;
                position: absolute;
                text-align: center;
                word-wrap: break-word;
                text-overflow: ellipsis;
                text-shadow: 1px 1px #000;
            }
            .flouns_rewardImage {
                width: 28px;
                height: 28px;
                margin-top: 43px;
                margin-left: 32px;
                position: absolute;
            }
            .flouns_rewardCost {
                width: 90px;
                font-size: 14px;
                margin-top: 69px;
                position: absolute;
                text-align: center;
                border-bottom-left-radius: 3px;
                border-bottom-right-radius: 3px;
                background-color: rgba(0,0,0,0.5);
            }
            #flouns_version {
                float:left;
                width: 100%;
                color: #555;
                padding: 5px;
                font-size: 12px;
                margin-top: 20px;
                text-align: right;
            }
            #flouns_reload {
                color: #999;
                float: left;
                width: 92px;
                margin: 5px;
                height: 92px;
                cursor: pointer;
                font-size: 40px;
                vertical: middle;
                line-height: 92px;
                text-align: center;
                border-radius: 4px;
                border: 1px solid #999;
                text-shadow: 1px 1px #000;
            }
            #flouns_reload:hover {
                color: #FFFFFF;
                border: 1px solid #DDD;
                background-color: #9147ff;
                box-shadow: 0px 0px 5px #FFF;
            }
        `;
        document.head.appendChild(style);

        const link = document.createElement('link');
        link.href = `https://fonts.googleapis.com/css2?family=Ubuntu&display=swap`;
        link.rel = `stylesheet`;
        document.head.appendChild(link);
        
    }

    function flouns_adjustPanel() {

        if(document?.getElementsByClassName('chat-room__content')[0]
        && document?.getElementsByClassName('chat-wysiwyg-input__box')[0]
        && document?.getElementById('flouns_panel')) {

            const top = document.getElementsByClassName('chat-room__content')[0].getBoundingClientRect().top;
            const bottom = document.getElementsByClassName('chat-wysiwyg-input__box')[0].getBoundingClientRect().top;
            const height = bottom - top;
            document.getElementById('flouns_panel').style.height = height + 'px';
        }
    }

    window.addEventListener('resize', () => {
        flouns_adjustPanel();
    });

    // try inject if needed
    // load page  -> try inject
    // change url -> try inject
    // untimeout  -> try inject
    if( flouns_authToken !== null) {
        setInterval(() => {
            flouns_injectHTML();
        }, 1000);
    } else {
        console.log('Chill Rewards : déconnecté.');
    }
    
    // inject CSS to header page
    flouns_injectCSS();
})();
