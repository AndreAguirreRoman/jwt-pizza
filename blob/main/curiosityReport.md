# Curiosity Report: How GitHub pages use TLS certificates from Let's Encrypt to force HTTPS

### Summary

Github Pages is a service to host a website directly from  Github.
It provides a static site hosting service from HTML, CSS, and JS files from the Github repo, to automatically publish the website.
There are some limitations like one page per account, but it is a very popular option among developers to show themselves. Going through StackOverflow, I found a lot of people asking questions on the topic, and found a couple examples of people that update them consistently. I will focus on how GitHub forces HTTPS, which is important to “prevent others from snooping on or tampering with traffic” (GitHub Docs).

### Learned


I was introduced to GitHub 4 years ago. I have used it all the time through college, but I wasn't aware of all the features that Github has, one of them being GitHub pages. I looked through their documentation to understand how it works. As I was reading the instructions for the deliverable using Github pages, I saw the force HTTPS. I was aware of the difference between HTTP protocol and HTTPS, so I didn't think too much about it, until I opened their documentation. I learned that Github uses a third-party service called Let's Encrypt for its TLS certificates to automatically enforce HTTPs, without any human interference. 
Github performs a DNS validation to prove the ownership of the domain, and then uses ACME protocol to request and install the certificate without human interference.
As I set up my AWS services I saw that you actually lease this certificate for 1 year, and it has to be renewed. Github pages with Let's Encrypt has certificates that last 90 days, but Github renews them automatically.
This is really important because HTTPS is the most secure mainstream protocol to handle information, despite this service used for static pages, it is still important to use it, for example with a simple google search I found that `Bootstrap` uses GitHub pages for their website: `https://getbootstrap.com/`
I also found an old `yelp` Github page's site where they shared their open source projects `https://yelp.github.io/`, and a simple personal website from a developer: `https://thundergolfer.com/`.
I was surprised to find out that such big companies use Github pages, showing that this service is used extensively, and despite their use, enforcing HTTPS is critical, it protects the data transmitted, specially protecting tokens, and other sensitive information and helps avoid other using this information inappropriately.
For me, the most important thing is that all of this is free. AWS certificate manager and Let's Encrypt both provide the TLS certificates. Let's encrypt is simpler to use with their full automation and AWS is another service of their cloud infrastructure, that requires more configuration but ultimately allows for more customization. Funny enough `AWS` is a major sponsor of diamond-level to Let's encrypt, which means that they support with `500K dollars each year` to `Let's Encrypt`. Github is a supporter as well but of smaller tier. Regardless, Github validates the domain, and then request the certificate from Let's Encrypt to install it on the servers, allowing HTTPS to be forced without any other configuration. Let's Encrypt does not take money from Github, they are a non-profit, they do take money from their sponsorship programs to fund their services, there are multiple services but Let's Encrypt is free.

### Process

1. First I visited the Github Pages website (https://docs.github.com/en/pages) to read their documentation. I got a lot of information about the service in that page, but I managed to find their HTTPS section (https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https), where they talk about how they force HTTPS in Github Pages.
2. I followed the instructions in the quickstart page (https://docs.github.com/en/pages/quickstart). I didn't want to buy another domain so instead of following the deliverables instructions I followed the documentation.
3. I started by creating another repo with `<username>.github.io`, this is important because if we don't provide a domain, we need to follow this naming convention, so github can create the website automatically, if we dont do it like: `andreaguirreroman.github.io` andrea... being my username, the website won't be hosted.
4. I chose a public repository since GitHub Pages requires public repositories for free accounts.
5. I created my repository, I chose not to add the README file, since I will add one later.
6. I created a simple index.html file to generate a simple website to test the functionality, with the following code:
```
<!DOCTYPE html>
<html>
  <head>
    <title>Andre's Site</title>
  </head>
  <body>
    <h1>Hello Andre 🚀</h1>
    <p>GitHub Pages site is live.</p>
  </body>
</html>
```
7. I then went to settings, in the Code and Automation tab click on `pages`, here you can see a bunch of options, at the very bottom saying `Enforce HTTPS` to force HTTPS, which will allow Github to connect to `Let's Encrypt` to enforce HTTPS.
8. I then visited the newly created site at: (https://andreaguirreroman.github.io/) where I confirmed that the HTTPS protocol is active. Even if you try HTTP http://andreaguirreroman.github.io/, the site will be redirected to the HTTPS protocol site.
![img]()
9. While reading the instructions, I reached their **changing the title and description** section and I learned about the `Jekyll` them that they have. In the instructions I had the following steps to follow:

*The _config.yml file already contains a line that specifies the theme for your site.*

*Add a new line with title: followed by the title you want*

*Add a new line with description: followed by the description you want. For example:*
```
theme: jekyll-theme-minimal
title: Octocat's homepage
description: Bookmark this to keep an eye on my project updates!

```
10. I created a `_config.yml` file in the root of my repository using the configuration shown above, including a theme, title, and description. I then tried to display the description on my page adding the following code to my `index.html` file 
```
    <p>{{ site.description }}</p>
```
11. While testing this, I noticed that the variable was not being rendered. I learned that Jekyll does not process HTML files unless they include front matter (---) at the top. After adding this, the variable worked correctly.

`Index.html` should look like this:

```
---
---
<!DOCTYPE html>
<html>
  <head>
    <title>Andre's Site</title>
  </head>
  <body>
    <h1>Hello Andre 🚀</h1>
    <p>GitHub Pages site is live.</p>
    <p>{{ site.description }}</p>
  </body>
</html>
```
12. I then returned to the website to confirm that everything works correctly!



### EXTRAS

GitHub Pages has a theme called Jekyll, which is a static site generator that processes files and applies templates automatically. This reminded me of reducing toil, and how there are multiple ways that we can automate, and update different parts of the application.
By trial and error, I learned that Jekyll only processes files if they include front matter (---), otherwise the file is treated as plain HTML.
Also, I observed that GitHub Pages automatically enforces HTTPS using Let's Encrypt, which improves security without requiring manual configuration. This was different from the instructions I followed in the deliverable using a `custom domain, where I had to click the enforce HTTPS` if you use Github pages, with their provided domain, you don't have to do that. Pretty cool!

Ultimately, there are multiple ways to work with Github pages, learning about how they implement and force HTTPS is very interesting.


# Conclusion

Github pages is a very helpful service that provides free, and efficient way to deploy static websites, with a degree of security enforcing HTTPS by using `Let's Encrypt`. By going into StackOverflow forums, reddit threads, and Google, I was able to find that it is a widely used service, that depends on the encryption of websites.

I really appreciate the work done by Lets Encrypt. In their website they claim over 700 thousand websites use their service. I didn't realize how important HTTPS protocol is in the modern web development, and I believe they do to, that is why I believe they share their service for free, to encourage this security, to stop thinking about it as optional.

Ultimately, from this curiosity report, I now have the tools to host my own website that I will use to share a portfolio of my projects I have worked and I am working on.