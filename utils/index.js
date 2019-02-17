const fetch = require('node-fetch')
const fs = require('fs');
const path = require('path');
const log = require('../log')
const { addList } = require('./crud');

const req_options = {
    token: process.env.tokenTrello,
    pos: 65535,
    closed: false,
    idLabels: [],
    idMembers: [],
    dateLastActivity: 1547258041135
}


const trello_headers = {
    cookie: process.env.cookieTrello,
    'Content-Type': 'application/json'
}

const medium_headers = {
    cookie: process.env.cookieMedium,
    'X-XSRF-TOKEN': process.env.tokenMedium,
}

function parseJSON(obj) {
    return {
        ...obj,
        key: JSON.parse(obj.key).map(k => createRegex(k.replace(/(^\/)|(\/$)/g, ''))),
        items: new Set()
    }
}

// ==========================================================

function updateJSON(obj, file, needsMap = true) {
    needsMap && (obj.filters = obj.filters.map(convertToJSON))
    fs.writeFileSync(file, JSON.stringify(obj))
}

// ==========================================================

function createRegex(key) {
    return new RegExp(`${key}`)
}

// ==========================================================

function filter_info(name, key, boundary = null) {
    return {
        name,
        // key: key.map(k => new RegExp(`${k}`)),
        key: key.map(createRegex),
        items: new Set()
    }
}

// ==========================================================

function location_info(idList, id_board) {
    return {
        id_board,
        idList
    }
}

// ==========================================================

function filterResults(arr) {
    return arr.map(item => {
        const arr = item.split('?')[0].split(/-([A-Za-z0-9]+)?/)
        const id = arr[arr.length - 2]

        return {
            id,
            url: item
        }
    });
}

// ==========================================================

function results(arr, filters) {
    const unfiltered = new Set();
    let cnt = 0;
    let filtered = arr.reduce((memo, curr) => {
        let last_backslash = curr.url.lastIndexOf('/');
        let question_mark = curr.url.lastIndexOf('?')
        let str = curr.url.substring(last_backslash + 1, question_mark);
        str = str.split('-').slice(0, -1).join(' ')

        let ok = false;
        let ind;
        memo.forEach((item, i) => {
            if (!ok) {
                let found = item.key.some(k => k.test(str.toLowerCase()))
                if (found)
                    ok = true, ind = i
            }
        })
        if (ok && !memo[ind].items.has(curr))
            memo[ind].items.add(curr), cnt++;
        else unfiltered.add(curr)

        return memo;
    }, filters);

    return {
        filtered,
        unfiltered
    }
}

// ==========================================================

// Add card to trello
function addCard(trello_info, link) {
    return function () {
        return new Promise(async (resolve, reject) => {
            try {
                const resp = await fetch('https://trello.com/1/cards', {
                    headers: trello_headers,
                    method: "POST",
                    body: JSON.stringify({
                        ...req_options,
                        ...trello_info,
                        name: link
                    })
                });
                if (!resp.ok) {
                    throw resp
                }

                resolve((await (resp.json())))
            } catch (err) {
                reject((await err.text()))
            }
        })
    }
}

// ==========================================================

 // Delete bookmark from Medium
 function deleteBookmark(id) {
     return function () {
         return new Promise(async (resolve, reject) => {
             try {
                 const resp = await fetch(`https://medium.com/p/${id}/bookmarks`, {
                     headers: medium_headers, // Cookies and CSRF token
                     method: "DELETE",
                 })

                 if (!resp.ok)
                     throw resp

                 resolve((await resp.text()))
             } catch (err) {
                 reject((await err.text()))
             }
         });
     }
 }

// ==========================================================

async function save(arr, bigObj, storeTemp) {
    const { trello } = bigObj; 
    const stdin = process.openStdin();
    let r = arr.reduce((memo, curr) => {
        if ([...curr.items].length) {
            let temp = memo[curr.name] || [];
            temp.push(curr.items)
            memo[curr.name] = temp
        }
        return memo
    }, {});
    let needsUpdate = false;

    for (const [key, val] of Object.entries(storeTemp)) {
        const setContent = r[key] && r[key][0] || new Set();
        [...val.values()].forEach(setContent.add.bind(setContent));
        
        !r[key] && ( r[key] = [], r[key][0] = setContent );
    }

    const allRequests = []
    for (let prop of Object.keys(r)) {
        if (!trello[prop]) {
            needsUpdate = true;

            console.log('still missing in trello', [...r[prop][0], prop])
            log('');
            process.stdout.write(`do you want to create the '${prop}' list now ? (y/n)`)

            // Wait for the user to accept/decline
            await new Promise((resolve, reject) => {
                stdin.addListener('data', async data => {
                    const answer = data.toString().toLowerCase().trim()
    
                    if (answer === 'y') {
                        await addFilterKey([`create!${prop}`, []], bigObj, true);
                    } else {
                        console.log('you must create the list before proceeding!')
                        process.exit(1);
                    }

                    resolve();
                })
            });
        }

        // If the prop did not existed, this will execute after the user has accepted to create the list
        log(`\t ${prop.toUpperCase()}\n`);
        [...r[prop][0]].flatMap(data => {
            log(`Adding ${data.url} to ${prop} - ${new Date().toLocaleDateString()} \n`);
            allRequests.push([
                addCard(trello[prop], data.url),
                deleteBookmark(data.id)
            ]);
        })
    }
    // Update after some changes have been made(adding keywords | creating new lists)
    needsUpdate && updateJSON(bigObj, './config.json');

    process.stdout.write('All good? (y/n)');

    stdin.addListener('data', text => {
        const resp = text.toString().trim()

        if (resp === 'y' || resp === 'Y') {
            console.log('processing the requests...')
            processRequests(allRequests)
        } else {
            console.log('Ok, make your changes. I\'ll wait here!')
        }

        stdin.pause();
    })

}

// ==========================================================

async function processRequests(requests) {
    let errorFound = false;

    try {
        await Promise.all(
            requests.flatMap(async ([addCard, deleteMediumBookmark]) => {
                return [
                    await addCard(),
                    await deleteMediumBookmark()
                ]
            })
        )
    } catch {
        console.log('An error has occurred! Please make sure that your cookies / tokens are up to date');
        errorFound = true;
    } finally {
        errorFound ? null : console.log('Links added successfully');
        clearFileContent(path.resolve(__dirname, '..', 'temp.json'));
    }
}

// ==========================================================
/* 
@if bigObj === false - add list to trello on the fly
*/
async function addFilterKey([nameToFind, newKey], bigObj, onlyCreateList = false) {
    const { trello } = bigObj;

    let index_field = -1,
        newField;
    
    const mustCreateIndex = nameToFind.indexOf('!');

    mustCreateIndex === -1 &&
        (index_field = bigObj.filters
            .findIndex(({
                name
            }) => name === nameToFind))
        || (newField = nameToFind.slice(mustCreateIndex + 1)) 
    
    if (index_field === -1 && mustCreateIndex === -1) {
        console.log(`${nameToFind} cannot be found.`)
        const suggestions = bigObj.filters.filter(({ name }) => {
            return name.includes(nameToFind) 
                || nameToFind.includes(name)
                || nameToFind.includes('_') 
                    &&  nameToFind.split('_').some(item => name.includes(item))
        })
        .map(filter => filter.name)

        console.log(`Maybe you meant: ${suggestions}`)
        process.exit(1)
    }

    // If the `create!field <field_key>` command has been executed
    if (index_field === -1) {
        onlyCreateList === false
            && bigObj.filters.push({
                name: newField,
                key: newKey,
                items: new Set()
            });
        // Add list to trello obj as well
        console.log(`adding ${newField}`)
        const { id, name, idBoard } = await addList(newField);
        trello[name] = location_info(id, idBoard);
    } else {
        bigObj.filters[index_field].key.push(...newKey)
    }
}

// ==========================================================

function convertToJSON(obj) {
    const newKeyArr = JSON.stringify(obj.key.map(k => k.toString()))
    
    return {
        ...obj,
        key: newKeyArr,
    }
}

// ==========================================================

function showList (list) {
    list.map(({ name }) => name).sort().forEach(log)
}

// ==========================================================
async function getUnfilteredLinks() {

    let res = await (await fetch('https://medium.com/me/list/bookmarks', {
        headers: medium_headers
    })).text()

    res = res.split('<div class="loadingBar"></div>')[0];
    const newLink = /https:\/\/\S+\/[a-z-0-9\?=]+-+\d+-+/g;
    const unfilteredLinks = [...new Set(res.match(newLink))]

    if (!unfilteredLinks.length) {
        log("Hmm... there are no bookmarks!!")
        process.exit(0);
    }

    return unfilteredLinks;
}

// ==========================================================

function fetchTrelloInfo () {
    return new Promise (async (resolve, reject) => {
        try {
            const trelloInfo = await fetch(process.env.urlTrello, {
                headers: trello_headers,
                method: "GET"
            });

            if (!trelloInfo) {
                throw trelloInfo;
            }

            resolve((await (trelloInfo.json())))
        } catch (err) {
            reject(err)
        }
    })
}

// ==========================================================

function readFile(file) {
    return new Promise ((resolve, reject) => {
        fs.access(file, (err, _) => {
            if (err) reject();
            resolve();
        });
    })
}

// ==========================================================

function isEmptyObject (obj) {
    return JSON.stringify(obj) === JSON.stringify({});
}

// ==========================================================

function clearFileContent (file) {
    fs.writeFile(file, '', (err, _) => {});
} 

module.exports = {
    parseJSON,
    createRegex,
    filter_info,
    location_info,
    filterResults,
    results,
    addCard,
    deleteBookmark,
    save,
    addFilterKey,
    convertToJSON,
    getUnfilteredLinks,
    updateJSON,
    fetchTrelloInfo,
    showList,
    readFile,
    isEmptyObject,
}