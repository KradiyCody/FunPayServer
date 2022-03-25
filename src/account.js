import fetch from 'node-fetch';
import { log } from './log.js';
import { parseDOM } from './DOMParser.js';
import { load, updateFile } from './storage.js';

const config = load('config.json');
const headers = { "cookie": `golden_key=${config.token}`};

async function countTradeProfit() {
    let result = 0;
    let ordersCount = 0;
    try {
        let first = true;
        let continueId;
        while(1) {
            let method, data;
            if(!first) {
                method = 'POST';
                data = `${encodeURI('continue')}=${encodeURI(continueId)}`;
                headers["content-type"] = 'application/x-www-form-urlencoded';
                headers["x-requested-with"] = 'XMLHttpRequest';
            } else {
                first = false;
                method = 'GET';
            }

            const options = {
                method: method,
                body: data,
                headers: headers
            };
    
            const resp = await fetch(`${config.api}/orders/trade`, options);
            const body = await resp.text();

            const doc = parseDOM(body);
            const items = doc.querySelectorAll(".tc-item");
            const order = items[0].querySelector(".tc-order").innerHTML;
            const continueEl = doc.querySelector(".dyn-table-form");

            if(continueEl == null) {
                break;
            }

            continueId = continueEl.firstElementChild.value;

            items.forEach(item => {
                const status = item.querySelector(".tc-status").innerHTML;
                if(status == `Закрыт`) {
                    ordersCount++;
                    let price = item.querySelector(".tc-price").childNodes[0].data;
                    price = Number(price);
                    result += price;
                }
            });
            log(`Продажи: ${ordersCount}; Заработок: ${result} ₽`);
        }
    } catch (err) {
        log(`Ошибка при подсчёте профита: ${err}`);
    }
    return result;
}

function autoUserDataUpdate(timeout) {
    setInterval(getUserData, timeout);
    log(`Автоматический апдейт данных запущен.`);
}

async function getUserData() {
    let result = false;
    try {
        const options = {
            method: 'GET',
            headers: headers
        };

        const resp = await fetch(config.api, options);
        const body = await resp.text();

        const doc = parseDOM(body);
        const appData = JSON.parse(doc.querySelector("body").dataset.appData);

        let setCookie = "";
        resp.headers.forEach((val, key) => {
            if(key == "set-cookie") {
                setCookie = val;
                return;
            }
        });

        const PHPSESSID = setCookie.split(';')[0].split('=')[1];

        if(appData.userId != 0) {
            result = {
                id: appData.userId,
                csrfToken: appData["csrf-token"],
                sessid: PHPSESSID
            };
            updateFile(result, '../data/appData.js');
        } else {
            log(`Необходимо авторизоваться.`);
        }
    } catch (err) {
        log(`Ошибка при получении данных аккаунта: ${err}`);
    }
    return result;
}

export { headers, getUserData, countTradeProfit, autoUserDataUpdate };