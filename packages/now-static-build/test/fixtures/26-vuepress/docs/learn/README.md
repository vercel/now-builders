---
sidebar: auto
type: guide
---

# VuePress Blog Boilerplate

## Introduction

Welcome to my guide on how to use the [VuePress Blog Boilerplate](https://github.com/bencodezen/vuepress-blog-boilerplate/)! This project was born out of a desire to use [VuePress](https://vuepress.vuejs.org) as my blogging engine and no clear path to do so.

### Version

This project is currently at `version {{ $themeConfig.version }}`.

### Purpose

The objective for this project is simple:

> To provide a blueprint of how blogging is possible with [VuePress](https://vuepress.vuejs.org/) and empower you with enough boilerplate so you feel comfortable customizing it to your liking.

### Features

By using this boilerplate, in addition to all the awesome things that already come with [VuePress](https://vuepress.vuejs.org), you get the following out of the box:

- Automatically generated recent posts on the home page
- Simple Google Analytics configuration
- Automatic RSS Feed Generation
- Easy favicon configuration
- Simple pagination on the home page
- Archived page of all posts sorted by date

Piece of cake right? Well time's a wasting, let's get to it!

## Getting Started

### Prerequisites

- [NodeJS >= 8](https://nodejs.org/)
- [yarn](https://yarnpkg.com/lang/en/docs/install/) (Optional)
- Basic knowledge of navigating the terminal

### Installation

::: tip
If your plan is follow the tutorial all the way through to deployment, make sure you fork this project instead of simply cloning it!
:::

In your terminal, navigate to the desired directory where you want this project to live.

```bash
# Clone the repo for local development
git clone https://github.com/bencodezen/vuepress-blog-boilerplate.git

# Change directory into project
cd vuepress-blog-boilerplate

# Install dependencies
npm install # or yarn

# Run local server
npm run dev # OR yarn dev
```

You should now be able to visit [http://localhost:8080](http://localhost:8080) to see your local server running!

## Tutorial

### Step 1: Create your first blog post

1. Create a new file called `my-fourth-post.md` in the `./src/blog` directory

Your file explorer should now look like this:

```{8}
.
├── src
│   └── .vuepress
│   └── blog
│       └── my-first-post.md
│       └── my-second-post.md
│       └── my-third-post.md
│       └── my-fourth-post.md
│   └── README.md
├── .gitignore
├── package.json
├── README.md
```

2. Open `my-fourth-post.md` in your favorite text editor.

3. Copy and paste the following into your markdown file:

```
---
title: My Fourth Post
date: 2018-12-28 17:22:00
type: post
blog: true
excerpt: I'm creating my first post!
tags:
    - Blogging
    - Tutorials
---

# Hello!

This is pretty awesome!

::: tip
Aren't custom containers cool?
:::

> "I have a big head... and little arms." - T-rex from 'Meet the Robinsons'
```

4. Once you save, you should now see the fourth post show up on your home page!

5. :confetti_ball: You now have the ability to write all the blog posts you want!

### Step 2: Create a new page

Odds are you will also want to customize the top navigation with a couple pages of your own to personalize the site. So let's create a simple About page together!

1. Create a new directory in the `./src` directory called `about`

2. Create a new file in the new `about` directory called `README.md`

```{4-5}
.
├── src
│   └── .vuepress
│   └── about
│       └── README.md
│   └── blog
│   └── README.md
├── .gitignore
├── package.json
├── README.md
```

::: tip
`README.md` files in directories get converted to `index.html` files at build time so don't worry if it looks weird right now.
:::

3. Let's just paste something simple in the `about/README.md` file.

```md
# About Me

I'm a great developer who has a lot of great things to share with the world.
Can't wait to start writing more about topics I love and am passionate about!
```

4. Now if you visit, `http://localhost:8080/about/`, you should see your page!

::: warning
If you are getting an error, just restart your VuePress server and everything should be good to go!
:::

### Step 3: Add an item to the main nav

1. Open the `./src/.vuepress/config.js` file in your favorite text editor

2. Locate the section under `themeConfig.nav`:

```js{12-15}
module.exports = {
	title: 'My New VuePress Blog',
	ga: '',
	dest: './public',
	themeConfig: {
		repo: 'https://wwww.github.com',
		repoLabel: 'Custom Repo Label',
		docsDir: 'src',
		logo: '/vuepress-blog-logo.png',
		editLinks: true,
		editLinkText: 'Found a bug? Help me improve this page!',
		nav: [
			{ text: 'Home', link: '/' },
			{ text: 'RSS Feed', link: '/rss.xml' }
		]
	},
```

3. Add a new object for the About page to the `nav` array like this:

```js{14}
module.exports = {
	title: 'My New VuePress Blog',
	ga: '',
	dest: './public',
	themeConfig: {
		repo: 'https://wwww.github.com',
		repoLabel: 'Custom Repo Label',
		docsDir: 'src',
		logo: '/vuepress-blog-logo.png',
		editLinks: true,
		editLinkText: 'Found a bug? Help me improve this page!',
		nav: [
			{ text: 'Home', link: '/' },
            { text: 'About', link: '/about/' },
			{ text: 'RSS Feed', link: '/rss.xml' }
		]
    },
```

::: warning
When you want the user to go to the `index.html` of a directory, it's critical that you put a `/` at the end of the relative link because it will break otherwise.

```js
// Good
{ text: 'About', link: '/about/' }

// Bad
{ text: 'About', link: '/about' }
```

:::

### Step 4: Deploy your site with Netlify

1. Create an account with Netlify if you don't already have one
1. Click `New site from Git` in the upper right corner
1. Choose your Git provider
1. Authorize Netlify to have access to your repos
1. Choose your VuePress blog repo
1. Configure the following "Build & deploy" settings:
   - **Branch to deploy**s: master
   - **Build command**: `npm run build`
   - **Publish directory**: `public/`
1. Click `Deploy site`

Now your site will automatically deploy whenever you push updates to your repo!

### Step 5: You're ready to go!

You have gone from zero to one! Congratulations! :confetti_ball:

For more advanced blogging features, be sure to check out the rest of the docs!

## Blogging Features

### Tags

You can tag your posts in frontmatter now.

Here is an example from:

```yaml
---
title: A Post with Tags
...
tags:
	- HTML
	- CSS
	- JavaScript
---
```

This will expose your tags in the `BlogPostList.vue` where it will filter down the displayed posts based on what tags are selected. Users will also be able to clear out the tags whenever tags are selected.

### Scheduling Posts for Future "Publishing"

This blog theme currently allows you to set future "publish"\* dates via [ISO-8601 format](https://en.wikipedia.org/wiki/ISO_8601) (i.e., YYYY-MM-DD hh:mm:ss).

### Time to Read Snippet

This is currently supported through [Darren Jenning's VuePress Plugin Reading Time](https://github.com/darrenjennings/vuepress-plugin-reading-time) and is configured in the `plugin` section of `config.js`.

You can find examples of its usage in `BlogPostPreview.vue` and `BlogPostList.vue` with snippets such as:

```js
$page.readingTime.text;
```

You can find more info about [options of the reading time plugin here](https://github.com/darrenjennings/vuepress-plugin-reading-time#usage).

## Site Configuration

Like any other site, there's still some manual configuration to do to add the final touches to your site. Here are the most important configurations you should consider for you blog:

### Site & Page Title

On most pages, VuePress uses the following pattern:

```html
<title>{{ $page.title }} | {{ $siteTitle }}</title>
```

#### Site Title

This attribute configures the site `<title>` element on your site. It is what determines `$siteTitle` in the VuePress app.

1. Open `./src/.vuepress/config.js` in your favorite text editor

```js{2}
module.exports = {
	title: 'My New VuePress Blog',
	...
}
```

2. Update the `title` key with your desired site title as a string

#### Page Title

By default, VuePress will assume that the h1 in your markdown file is the page title that you want:

```md
# My Heading One That Turns into a Title
```

If you would like to explicitly set a specific page title, use frontmatter to overwrite the default.

```
---
title: My Custom Title to Override the H1
---

# My Heading One That Turns into a Title
```

### Logo

The logo is responsible for the image that you see in the upper left corner. The default is for it to be blank, but I found that most people like having their logo on their site and have turned included it in the boilerplate.

In order to update your logo, this is controlled in your `config.js` file under the `themeConfig` key:

```js{6}
module.exports = {
	title: 'My New VuePress Blog',
	dest: './public',
	themeConfig: {
		...,
		logo: '/vuepress-blog-logo.png'
	}
}
```

The path to your image is based on `.vuepress/public` directory.

#### Examples

```js
// If your logo is in `.vuepress/public/your-logo.png`
module.exports = {
  themeConfig: {
    logo: '/your-logo.png',
  },
};

// If your logo is in `.vuepress/public/img/your-logo.png`
module.exports = {
  themeConfig: {
    logo: '/img/your-logo.png',
  },
};
```

### Repo

This is your repo link that will be used for features like [Edit this page](https://v1.vuepress.vuejs.org/theme/default-theme-config.html#git-repo-and-edit-links) and the repo link.

This is controlled in `.vuepress/config.js` under `themeConfig`.

```js
module.exports = {
	...
	themeConfig: {
		...
		// The URL used for generating any features related to the URL
		repo: 'https://wwww.github.com',
		// The label that is used in the top nav
		repoLabel: 'Repo',
		...
	}
}
```

### Google Analytics

Odds are pretty good that you'd like to do some metric tracking for visitors to your blog and such. So luckily it's really easy to add your Google Analytics ID:

1. Login to your Google Analytics account
2. Create a new account for your site if you haven't already
3. Visit the `Admin` section of your account
4. Look for `Tracking Info` > `Tracking Code`
5. Copy the tracking ID to the clipboard:
   - It should look something like `UA-12345678-1`
6. Open `./src/.vuepress/config.js` in your favorite text editor
7. Update the `ga` property with your tracking ID

```js{4-9}
module.exports = {
	title: 'My New VuePress Blog',
	...
	plugins: [
		'@vuepress/google-analytics',
		{
			'ga': '' // UA-00000000-0
		}
	]
	...
}
```

### Favicon

Everything is already configured for favicons on your page. All you need to do is:

1. Use [Favicon Generator](https://realfavicongenerator.net/) to generate the appropriate files for favicons
   - And if you're wondering, I just used the default settings for this boilerplate
2. Replace all the files in `./src/.vuepress/public` and your favicon should just show up!

::: tip
In the event you need to manually modify the HTML elements related to favicon can be found in `./src/.vuepress/config.js` under the `head` key.

```js
module.exports = {
	head: [
		['link', { rel: 'icon', sizes: '32x32', href: '/favicon-32x32.png' }],
		...
	]
}
```

:::

### Site Repository

Given that VuePress is designed to optimize for technical documentation, the default theme has a priority to make the repository as easy to as access as possible.

#### Site Nav Item

When you start up your environment, you'll notice that the main navigation has the repo in the upper right. It's configured in `./src/.vuepress/config.js`:

```js{6-7}
module.exports = {
	title: 'My New VuePress Blog',
	ga: '',
	dest: './public',
	themeConfig: {
		repo: 'https://wwww.github.com',
		repoLabel: 'Repo'
	},
	...
}
```

- `themeConfig.repo`: This is the link that (1) determines whether the nav item displays and (2) Serves as the foundation for the Edit Links feature.
- `themeConfig.repoLabel`: The default is the hosting provider (i.e., GitLab or GitHub), but I think that's misleading from a semantic perspective since the user is going to your repo and not the company site "GitLab" or "GitHub". So I'm recommending "Repo" as an alternative.

#### Edit Links

Another great feature about VuePress is the ability to allow users to easily submit PRs to the page. That is configured here in `./src/.vuepress/config.js`:

```js{8-9}
module.exports = {
	title: 'My New VuePress Blog',
	ga: '',
	dest: './public',
	themeConfig: {
		repo: 'https://wwww.github.com',
		repoLabel: 'Repo',
		editLinks: true,
		editLinkText: 'Found a bug? Help me improve this page!',
	},
	...
}
```

- `themeConfig.editLinks`: This is turned off by default, but by adding this in with the boolean of true, it will generate the default text of "Edit this page" on the bottom of each page
- `themeConfig.editLinkText`: This override the default text generated by `themeConfig.editLinks`

::: warning
If the `themeConfig.repo` is not filled in, this feature will not work since it uses the repo link to generate the proper links.
:::

## Architecture

### How BlogPostList generates the posts

All blog posts are currently expected to live in the `./src/blog` directory in order for the `<BlogPostList />` component to render the preview of your post.

```{5-8}
.
├── src
│   └── .vuepress
│   └── about
│   └── blog
│       └── my-first-post.md
│       └── my-second-post.md
│       └── my-third-post.md
│   └── contact
│   └── README.md
├── .gitignore
├── package.json
├── README.md
```

::: tip
In case you're wondering, `<BlogPostList />` will automatically be sorted by date when the list is generated.
:::

### How the RSS feed is generated

The `rss.xml` file being generated at build time uses the [VuePress Plugin RSS](https://github.com/youngtailors/vuepress-plugin-rss) repo. Although not clear on the site, the determining factor for what determines whether something is added to the RSS feed is whether there is a frontend matter property of `type` with the value `post`.

```yaml
# This will get picked up by the RSS plugin
---
title: The Post I Want to Add to RSS
type: post
---
# This will not get picked up by the RSS plugin
---
title: The Post I Want to Add to RSS But Will Be Missing
---

```

In addition, I've configured an additional filter to check for posts that are set to be published in the future. After all, wouldn't that be weird to get a post in your RSS feed update that has a date in the future? :laughing:

## FAQs

### Why VuePress?

Many are probably wondering why use VuePress? After all, there are a ton of tools out there already built and optimized for blogging aren't there? And you would be absolutely correct! But in my work with VuePress so far, I found the engine quite powerful and intuitive to how I wanted to be able to write:

- Static site generator
- Minimal setup with markdown-centered project to help you focus on writing
- YAML Frontmatter for managing page specific meta data
- Use Vue components in your markdown content
- Develop custom themes with Vue
- Integrated markdown extensions that make the writing experience even easier. Examples include:
  - [Custom containers](https://vuepress.vuejs.org/guide/markdown.html#custom-containers)
  - [Code syntax highlighting](https://vuepress.vuejs.org/guide/markdown.html#line-highlighting-in-code-blocks)

And since it seemed like this was something other people wanted to do, I figured I would go ahead and see how far I could take this.

### Why is this separate from the VuePress repo?

As many of you might have experienced in the past, getting PRs reviewed and integrated into an existing open-source project is fairly difficult to do. And this is by no means the fault of the maintainers, there's just a lot going on and people clamoring for attention. So rather than have my work hidden from the world while it sits in a PR, my goal is to:

1. Keep updating this repo and guide so that people can make use of it and create content
2. Integrate the latest changes from the core VuePress repo in order to ensure the work is not duplicated
3. Submit PRs until this page will become an artifact of the past and everything will live in the core VuePress docs itself.

## Hat Tip

For those familiar with the [Vue.js](https://www.vuejs.org) ecosystem, you might be reminded of [Chris Fritz's](https://www.twitter.com/chrisvfritz) [Vue Enterprise Boilerplate](https://github.com/chrisvfritz/vue-enterprise-boilerplate) and you would be absolutely right. I thought the concept was brilliant and wanted to do something similar for the [VuePress](https://vuepress.vuejs.org) ecosystem since blogging is something that still requires a fair amount of configuration and knowledge in order to get started.

And in case you didn't know, Chris Fritz is one of the core contributors to the incredible [Vue.js docs](https://vuejs.org/v2/guide/) that we are love so much. So if you would like to help support him so he can spend more time on creating awesome content for the Vue.js community, please support him by [becoming a sponsor on Patreon](https://www.patreon.com/chrisvuefritz).
