import { sanitizeHtml } from '../js/helpers/SafeHtml.js';

function render(html, linkify) {
	const div = document.createElement('div');
	div.appendChild(sanitizeHtml(html, linkify));
	return div.innerHTML;
}

describe('sanitizeHtml', function () {
	it('keeps r2 color markup', function () {
		Assert.equal(render('<font color=\'#ff0000\'>mov</font><br /><span style="color:rgb(1,2,3)">x</span>'),
			'<font color="#ff0000">mov</font><br><span style="color:rgb(1,2,3)">x</span>');
	});

	it('drops scripts, handlers, links and unsafe css', function () {
		const out = render('<img src=x onerror=alert(1)><script>alert(2)</script>' +
			'<a href="javascript:alert(3)" onclick="x()">l</a>' +
			'<span style="background:url(javascript:1);color:red" onmouseover="y()">s</span>' +
			'<svg><g onload="z()">t</g></svg>');
		Assert.notMatch(out, /onerror|onclick|onmouseover|onload|javascript|<script|<img|<svg|href|url\(/i);
		Assert.include(out, '<span style="color:red">s</span>');
	});

	it('keeps worker classes and ids, filters unknown classes', function () {
		Assert.equal(render('<pre id="block1" title="1"><span class="fcn evil" id="a\'b">f</span></pre>'),
			'<pre id="block1" title="1"><span id="a\'b" class="fcn">f</span></pre>');
	});

	it('escapes entity-decoded text', function () {
		Assert.equal(render('&lt;img src=x onerror=alert(1)&gt;'), '&lt;img src=x onerror=alert(1)&gt;');
	});

	it('linkifies text outside links only', function () {
		const linkify = (t) => { const b = document.createElement('b'); b.textContent = t; return b; };
		Assert.equal(render('x<a class="r2seek">0x1</a>', linkify), '<b>x</b><a class="r2seek">0x1</a>');
	});
});
