# Brunch + Babel + Crank + Tachyons

This is a skeleton for [Brunch](http://brunch.io) that includes [Crank](https://crank.js.org/) and [Tachyons](https://tachyons.io/).

## Installation

Clone this repo manually or use `brunch new dir -s darrylcousins/brunch-with-crank`

## Getting started

* Install (if you don't have them):
    * [Node.js](http://nodejs.org): `brew install node` on OS X
    * [Brunch](http://brunch.io): `npm install -g brunch`
    * Brunch plugins and app dependencies: `npm install`
* Run:
    * `npm start` — watches the project with continuous rebuild. This will also launch HTTP server with [pushState](https://developer.mozilla.org/en-US/docs/Web/Guide/API/DOM/Manipulating_the_browser_history).
    * `npm run build` — builds minified project for production
* Learn:
    * `public/` dir is fully auto-generated and served by HTTP server.  Write your code in `app/` dir.
    * Place static files you want to be copied from `app/assets/` to `public/`.
    * [Brunch site](http://brunch.io), [Getting started guide](https://github.com/brunch/brunch-guide#readme)

## Crank

This brunch template is designed to get an application started with [Crank](https://crank.js.org/) including some simple examples.

## Tachyons

And because I like to use [Tachyons](https://tachyons.io/) that is also included.

## Eslint

```
npx eslint app/*.js
```

## Prettier

Helper for code formatting.

## JSDoc

```
npm run docs
```

## Autoreload

I've left autoreload out of this skeleton as I'm doing my developement remotely and using nginx and haven't yet researched how to configure things so I can avoid websocket errors. I'm therefore used to Ctrl-R.

## Nginx

My basic configuration looks like this:

```
server {
	listen 443 ssl;

	server_name $subdomain.$domain.net;

	ssl_certificate /etc/letsencrypt/live/.../fullchain.pem;
	ssl_certificate_key /etc/letsencrypt/live/.../privkey.pem;

	location / {
		auth_basic "Restricted Development Server";
		auth_basic_user_file /etc/nginx/.htpasswd;

		proxy_pass http://127.0.0.1:$myport;
		proxy_http_version 1.1;
		proxy_set_header Upgrade $http_upgrade;
		proxy_set_header Connection 'upgrade';
		proxy_set_header Host $host;
		proxy_cache_bypass $http_upgrade;
	}
	location /public {
		root $path-to-project;
		index index.html;
	}
	location /docs {
		root $path-to-project;
		index index.html;
	}
}
```

The path location to `public` is not essential as the proxy will serve
index.html without it, but dropping html files in app/assets are not served
from root otherwise. The alternative is to set up one's own [server](https://github.com/brunch/brunch-guide/blob/master/content/en/chapter10-web-server.md#writing-your-own-server) if not aiming for a single page app.
