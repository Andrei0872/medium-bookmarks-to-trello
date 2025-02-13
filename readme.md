
<!-- ### There is also an article about this.  -->

# Moving your Medium's Bookmarks to Trello
I firmly believe that our time should be spent on important things. <br>
*The time you spent searching for an article could be time spent on reading that article.*

## Quick Demo

<div style="text-align: center;">
    <img src="./screenshots/realDemo.gif">
</div>

---

## Getting started

* ```cp .env.example .env```

* ```npm i```

* [Setting up Trello](#setting-up-trello)

* [Setting up Medium](#setting-up-medium)

You might have to update the **.env** file from time to time, because cookies have limited lifetime.

---

## Features

*conventions*: field = list name; keyword = filter key

* fetch saved posts from Medium and transfer them to Trello and also remove them from bookmark list
* <details>
    <summary>
        the keywords for a field can also include regular expressions
    </summary>
    <p>
        <div>
            <img src="./screenshots/add-regex-key.gif">
        </div>
    </p>
  </details>
* <details>
    <summary>add keyword to a field</summary>
    <p>
        Syntax: <code> $field_name $filter_key1 | $filter_key2</code>
        <br>
        Example: <code>react react hooks | \bstyled components\b</code>
        <div>
            <img src="./screenshots/add-key.gif">
        </div>
    </p>
    </details> 
* <details>
    <summary>create field and add keywords to it</summary>
    <div>
        <p>
        Syntax: <code> create!$field_name $filter_key1 | $filter_key2</code>
        <br>
        Example: <code> create!posts development posts </code>
        <div>
            <img src="./screenshots/create-and-add-key.gif">
        </div>
        </p>
    </div>
    </details> 
* You can see where each card will be placed by having a look at **info.log** file after getting the message **All good? (y/n)**
* the `show_list` command will print the existing lists to the **info.log** file
* create a Trello list if the list name exists in **config.json**, but not in Trello
* <details>
    <summary>add link to a list(which doesn't have to exist) without applying any filters. <a href="https://github.com/Andrei0872/medium-bookmarks-to-trello/pull/2">Read More</a></summary>
    <p>
        Syntax: <code> temp!$list_name </code>
        <br>
        Example: <code> temp!react </code>
        <br>
        <div>
            <img src="./screenshots/add-temp.gif">
        </div>
    </p>
  </details>

---

## Setting up Trello

<details>
    <summary>
        Getting the idBoard & token & cookie
    </summary>
    <ul>
        <li>Create a new card</li>
        <li>Open the dev tools and open the Network tab</li>
        <li>Clear the Network tab.</li>
        <li>Create a new list(doesn't matter the name)</li>
        <li>Click on the <i>lists</i> request</li>
        <li>Click on the <i>Headers</i> tab</li>
        <li>Head over to <i>Request Payload</i></li>
        <li>Select the <i>idBoard</i> and paste it in the <i>.env</i> file</li>
        <li>Select the <i>token</i> and paste it in the <i>.env</i> file next to <i>tokenTrello</i></li>
        <li>Select the <i>cookie</i>(located in the Request Headers) and paste it in the <i>.env</i> file next to <i>cookieTrello</i></li>
        <br>
        <p><b>Companion Gif</b></p>
        <div style="text-align: center;">
            <img src="./screenshots/trello.gif">
        </div>
    </ul>
</details>

<details>
    <summary>
        Getting the trello-specific url (needed when adding a new list to a board)
    </summary>
    <ul>
        <li>Copy the short link from the url (https://trello.com/b/COPY_THIS_ONE/board_name)</li>
        <li>Head over the <i>urlTrello</i> property</li>
        <li>in the <i>.env</i> file replace the <i>YOUR_BOARD_ID</i> with the short link</li>
        <li>You may now delete the list you have created earlier</li>
    </ul>
    <p><b>Companion Gif</b></p>
    <div style="text-align: center;">
        <img src="./screenshots/trelloURL.gif">
    </div>
</details>


---

## Setting up Medium

Getting the cookie & token
* Go to your bookmarks
* Open the dev tools and go to the Network tab
* Refresh the page and scroll down until a new request is made (bookmarks?limit=20...)
* Select the <i>Headers</i> tab
* Copy the <i>cookie</i> located in the Request Headers and paste it in the <i>.env</i> file
* Coy the <i>x-xsrf-token</i> located in the Request Headers and paste it in the <i>.env</i> file

<p><b>Companion Gif</b></p>
<div style="text-align: center;">
    <img src="./screenshots/medium.gif">
</div>

## Usage

In your current directory: 
`node main.js`

[Available features](#features).

## Contributing

There are always improvements that could be made. All I ask is that you open an issue and we discuss your proposed changes before you create a pull request.
