function menuString (menu, str) {
  // TODO support split by space
  var s = [];
  for (var i in menu) {
    var m = menu[i].split(':')[0];
    if (str.length == 0 || m.toLowerCase().indexOf(str.toLowerCase()) != -1) {
      s.push(m);
    }
  }
  return s;
}

function menuCommand (menu, str) {
  // TODO support split by space
  for (var i in menu) {
    var m = menu[i].split(':', 2)[0];
    if (str.length == 0 || m.toLowerCase().indexOf(str.toLowerCase()) != -1) {
      return menu[i].split(':', 2)[1];
    }
  }
  return '';
}

function menuRun (name) {
  alert('MENURUN');
  modalAssembler();
}

function modalMenu () {
  var menu = [
    'Analyze:aaa',
    'Assembler:&Assembler',
    'Classes:icc',
    'Disassemble:pdf',
    'Entropy:p=e 200',
    'Flags:f',
    'Flagspaces:fs',
    'Eval:e',
    'Summary:pds',
    'Functions:afl',
    'Graph:agf',
    'Imports:ii',
    'Info:iA;ie;im;i;o;it;iT',
    'Libraries:il',
    'Notes:&Notes',
    'Packages:!r2pm -s',
    'Installed:!r2pm -l',
    'Raw Strings:izz',
    'Relocs:ir',
    'Sections:iS',
    'Segments:iSS',
    'Strings:iz',
    'Symbols:is'
  ];
  var body = html.div('modal_body');
  var out = html.div('modal_output', '', {
    overflow: 'hidden',
    backgroundColor: 'red',
    height: '100px',
    border: '10px solid red'
  });
  var inp = html.input('input', '', function onreturn () {
    var cmd = menuCommand(menu, inp.value);
    if (cmd == '') {
    } else if (cmd[0] === '&') {
      menuRun(cmd);
    } else {
      r2.cmd(cmd, function (res) {
        res = res.replace(/\n/g, '<br/>');
        out.innerHTML = r2.filter_asm(res, 'pd');
      });
    }
    inp.value = '';
  }, function onkey () {
    var txt = menuString(menu, inp.value);
    out.innerHTML = txt.join('<br/>');
  });
  body.appendChild(inp);
  out.style.overflow = 'scroll';
  out.style.height = '100%';
  body.appendChild(out);
  body.input = inp;
  var txt = menuString(menu, inp.value);
  out.innerHTML = txt.join('<br/>');
  return body;
}

function modalShell () {
  var body = html.div('modal_body');
  var out = html.div('modal_output', '', {
    overflow: 'hidden',
    backgroundColor: 'red',
    height: '100px',
    border: '10px solid red'
  });
  var back = html.a('back', function () {
    r2.cmd('s-;s', function (res) {
      r2ui.seek(res);
    });
  });
  var inp = html.input('input', '', function () {
    seekAction = function (addr) {
      r2.cmd(inp.value, function (res) {
        function fill (res) {
          var txt = r2.filter_asm(res, 'pd');
          out.innerHTML = txt;
        }
        if (res === '') {
          if (promptCommand !== '') {
            r2.cmd(promptCommand, fill);
          }
        } else {
          fill(res);
          promptCommand = inp.value;
        }
        inp.value = '';
      });
    };
    seekAction();
  });
  body.appendChild(back);
  body.appendChild(inp);
  out.style.overflow = 'scroll';
  out.style.height = '100%';
  body.appendChild(out);
  body.input = inp;
  return body;
}

function modalAssembler () {
  var body = html.div('modal_body');
  var out = html.div('modal_output', '', {
    overflow: 'hidden',
    backgroundColor: 'red',
    height: '100px',
    border: '10px solid red'
  });
  var inp = html.input('input', '', function onreturn () {
    r2.cmd('"pa ' + inp.value + '"', function (res) {
      out.innerHTML = r2.filter_asm(res, 'pd');
    });
  }, function onkey () {
    r2.cmd('"pa ' + inp.value + '"', function (res) {
      out.innerHTML = r2.filter_asm(res, 'pd');
    });
  });
  body.appendChild(inp);
  out.style.overflow = 'scroll';
  out.style.height = '100%';
  body.appendChild(out);
  body.input = inp;
  return body;
}
