radare2-webui
=============

[![Code Climate](https://codeclimate.com/github/radare/radare2-webui/badges/gpa.svg)](https://codeclimate.com/github/radare/radare2-webui)

This repository contains the different WebUIs for radare2:
* `enyo` enyo (mobile)
* `m` material (responsive)
* `p` panels (desktop)
* `t` tiles (legacy)

# Install

First, you should install [radare2](https://github.com/radare/radare2), then `r2pm` will handle this for you:

    $ r2pm -i www-enyo
    $ r2pm -i www-m
    $ r2pm -i www-p
    $ r2pm -i www-t

This process will install the proper UI by downloading the latest version available.

## Troubleshooting

The Web UIs (/m specifically) are using some tools that require an updated version of `node`, so if you encounter the following error, you should consider an update.

    ~/radare2-webui/www/m/node_modules/gulp-google-webfonts/index.js:209
        request.name = path.posix.join(options.fontsDir, request.name);
    TypeError: Cannot call method 'join' of undefined

Updating node is easy, I recommand you to follow this [article](https://davidwalsh.name/upgrade-nodejs):

    sudo npm cache clean -f
    sudo npm install -g n
    sudo n stable

# Use it

You can run one of the UI by typing the following command with: `enyo`, `m`, `p` and `t`.

    $ r2 -q -e http.ui=<UI> -c=H /bin/ls

# Uninstall

To uninstall an UI, you can use this command.

    $ r2pm -u <package>

# Soon...

You will soon be able to chose between a global installation or an installation from your home directory with `-g` option.

Also, we will propose you to install the last released version from a tarball with a specific option. 

# Contribute

If you want to contribute, you should [read this](https://github.com/radare/radare2-webui/blob/master/CONTRIBUTING.md) to know how to set your environment.