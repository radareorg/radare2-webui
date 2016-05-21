CONTRIBUTING
============

We will explain how to set up your environment to start working with the UI.

This will require: `radare2`, `node` and `npm`.

Fork
----

Fork the [official repository](https://github.com/radare/radare2-webui) and clone it on your computer:

    $ git clone https://github.com/radare/radare2-webui.git

Build
-----

You can build all UI all at once:

    $ make build

It will retrieve all the required dependencies using `npm`, `gulp` and `bower` and placing the right files into the `dist` directory that will be used when we will *run* it.

You can also build them separatly:

    $ make enyo
    $ make material
    $ make panel
    $ make tiles

If you encounter some problem with a *call method 'join' of undefined* building the material UI, try to [update](https://davidwalsh.name/upgrade-nodejs) `node`:

    sudo npm cache clean -f
    sudo npm install -g n
    sudo n stable

Run
---

You can see them working through this commands.

    $ make runenyo # enyo (mobile)
    $ make runm # material (responsive)
    $ make runp # panels (desktop)
    $ make runt # tiles (legacy)

Work
----

You are ready to make your modifications inside the `www` directory.

Contribute
----------

Commit your changes and send a pull request!
