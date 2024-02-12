# nah server (an experiment)

The theme of this week's HTML exercise is "linking" and "websites as places." Whenever you reference an external resource in an HTML document, like `<img src="./images/a-cat.jpg" />` or `<a href="my-other-page.html">go here</a>`, the browser fires off a request for that resource. On the other end of that request is usually a static web server, whose job it is to check if it has that resource and respond with it.

📄 HTML: `<img src="./images/a-cat.jpg" />`  
🖥️ Browser: "Can I have `./images/a-cat.jpg`?"  
💾 Server: "Ah, yes! I have `a-cat.jpg` in the `/images` directory. Here it is."

What might happen if that basic contract were broken? This is a simple static server that doesn't give you want you ask for.

💾 Server: "Hm, they want `a-cat.jpg`? Nah, I'll give them `a-giraffe.jpg` instead."

This server isn't _that_ chaotic. It'll at least give you a resource of the same type that you asked for. ¯\\_(ツ)\_/¯

## Run this server

```
npm install && npm start
```

Note: this server requires access to the filesystem to run, because it needs to see what other files are in the directory to randomly choose one to respond with.Most lightweight app hosting and deployment systems like Glitch and Netlify (the two that I use most often) don't allow filesystem access or they store static assets separately from application code. Maybe I'll work around this by hard-coding a list of files and their locations on the server to get a deployed version that works.

## Future explorations

This was kind of challenging to work on in a day! I'm curious about developing an nginx or apache server configuration for random routing. (They're both widely used servers for serving static assets.) This behavior might be more challenging to implement through web server configuration, rather than through application logic (and I wonder if expressjs is abstracting away lower level stuff I'd have to manage myself with nginx or apache, like HTTP response headers).

Also: what might a moody server look like?