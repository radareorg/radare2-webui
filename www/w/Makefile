all:
	r2  -q -e http.sandbox=false -e http.root=$$PWD/.. -e http.ui=m -c=H /bin/ls

update:
	git clone https://github.com/jdan/98.css git-98-css
	mkdir -p git-98-css/node_modules
	cd git-98-css && npm i && npm run build
	cp git-98-css/dist/98.css 98.css
