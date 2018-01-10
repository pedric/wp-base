# Whitespace julkalender 2017 #

## Requirements
- Node JS
- Composer
- Wordpress CLI

## Quick start

```
1. Clone the project to your local machine.
2. In ./site: create an .env file from .env.example and update the info in the file.
3. Add ACF PRO KEY (see bottom of readme) to the .env file
5. Run composer install
```

then

```
cd web/app/themes/ws_calendar/spacecraft
yarn
```

(Run `npm install` as alternative to `yarn` if `yarn` doesn't work)

finally,
for wordpress site

```
cd <project-root>/site
wp server --docroot=web --host=127.0.0.1
```

and then for generating assets and developing frontend (Make sure that the wordpress site is running on port:8080)

```
cd web/app/themes/vansterpartiet_ws/spacecraft
gulp proxy
```

## For local development

Create a local database and update your environment variables in `.env` file

## For deploying

run into `site` folder: `npm install` or `yarn`

then

`fly deploy:dev`

## For activating ACF PRO

Add this to your `.env` file:

```
# ACF PRO
ACF_PRO_KEY={YOUR-KEY}
```

ACF PRO key is in 1password

## For using Google Maps

Add this to your `.env` file:

```
# GOOGLE API KEY
GOOGLE_API_KEY={YOUR-KEY}
```
