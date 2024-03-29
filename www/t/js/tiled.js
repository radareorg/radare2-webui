function _ (x) { return document.getElementById(x); }

var html = {
  text: function (text) {
    var o = document.createElement('font');
    text.innerHTML = text;
    return o;
  },
  input: function (id, value, action, onkey) {
    var o = document.createElement('input');
    o.id = id;
    o.value = value;
    o.focus();
    o.onkeyup = function (ev) {
      if (ev.keyCode === 13) {
        action(o.value);
      } else if (onkey) {
        onkey(o.value);
      }
    };
    return o;
  },
  a: function (text, action) {
    var o = document.createElement('a');
    o.innerHTML = text;
    if (typeof action === 'string') {
      o.href = action;
    } else {
      o.href = '#';
      // assume function
      o.onclick = action;
    }
    return o;
  },
  div: function (id, css, style) {
    var o = document.createElement('div');
    if (id) {
      o.id = id;
    }
    if (css) {
      o.className = css;
    }
    if (style) {
      for (var k in Object.keys(style)) {
        o.style[k] = style[k];
      }
    }
    return o;
  }
};

function Tiled (id) {
  var obj = document.getElementById(id);
  var self = this;
  this.modal = null;
  this.curframe = undefined;
  this.frames = [];
  var topmargin = 20;
  var w = 3;
  var h = 0;
  this.update_size = function (width, height) {
    w = width || window.innerWidth;
    h = height || window.innerHeight;
  };
  this.max_width = function (set) {
    var col = this.curframe[1];
    for (var col in this.frames) {
      for (var row in this.frames[col]) {
        this.frames[col][row].mw = false;
      }
    }
    this.curframe[0].mw = set;
  };
  this.max_height = function (set) {
    if (this.curframe) {
      var col = this.curframe[1];
      for (var row in this.frames[col]) {
        var f = this.frames[col][row];
        f.mh = false;
      }
      this.curframe[0].mh = set;
    }
  };
  this.ctr2 = 0;
  this.tile = function () {
    if (this.modal) {
      var mtop = topmargin;
      var left = 0;
      var width = w - (w / 20);
      var height = h - mtop;

      var f = this.curframe[0];
      if (f === this.modal) {
        f.obj.style.position = 'absolute';
        f.obj.style['z-index'] = 1000;
        f.obj.style.zIndex = 100;
        f.style.zIndex = 100;
        f.obj.style.top = '10%';
        f.obj.style.bottom = '20%';
        f.obj.style.left = '20%';
        f.obj.style.right = '20%';
        // always on top.. or hide all the frames
        // TODO: add proportions
        // f.obj.style.width = width;
        // f.obj.style.height = height;
        // f.obj.style.backgroundColor = 'green';
        // f.obj.innerHTML =" blabla";
        if (f.update) { f.update(f.obj); }
        return;
      }
      f.obj.style['z-index'] = 0;
    }
    if (this.maximize && this.curframe) {
      var mtop = topmargin;
      var left = 0;
      var width = w;
      var height = h - mtop;

      var f = this.curframe[0];
      f.obj.style.position = 'absolute';
      f.obj.style.top = mtop;
      f.obj.style.left = left;
      // always on top.. or hide all the frames
      f.obj.style.zIndex = 99999 + this.ctr2++;
      // TODO: add proportions
      f.obj.style.width = width;
      f.obj.style.height = height;
      // f.obj.style.backgroundColor = "green";
      // f.obj.innerHTML =" FUCK";
      if (f.update) { f.update(f.obj); }
      return;
    }
    function getmaxh (self, col) {
      if (self.frames[col]) {
        for (var row in self.frames[col]) {
          var f = self.frames[col][row];
          if (f && (f.mh || f.selected)) { return true; }
        }
      }
      return false;
    }
    function getmaxw () {
      for (var col in this.frames) {
        for (var row in this.frames[col]) {
          var f = this.frames[col][row];
          if (f && f.mw) return true;
        }
      }
      return false;
    }
    var cols = this.frames.length;
    var left = 0;
    var hasmaxw = true; // getmaxw ();
    for (var col in this.frames) {
      var rows = this.frames[col].length;
      var mtop = topmargin;
      var cols = this.frames.length;
      var hasmaxh = getmaxh(this, col);

      var width = w / cols;
      var height = (h - topmargin) / rows;

      if (this.curframe && hasmaxw && this.frames.length > 1) {
        if (col === this.curframe[1]) {
          width = w / 2;
        } else {
          width = (w / 2) / (cols - 1);
        }
      }
      for (var row in this.frames[col]) {
        var f = this.frames[col][row];
        if (hasmaxh && this.frames[col].length > 1) {
          if (f.selected) {
            height = 1.7 * ((h - topmargin) / (rows));
          } else {
            var a = 1.7 * (h - topmargin) / (rows);
            height = (h - a) / (rows - 1);
          }
        } else {
          height = (h - topmargin) / rows;
        }
        height = 0 | height;
        f.obj.style.position = 'absolute';
        f.obj.style.top = mtop;
        f.obj.style.left = left;
        // TODO: add proportions
        f.obj.style.width = width;
        if (row === 0) {
          height -= 22;
        }
        f.obj.style.height = height;

        // f.obj.style.backgroundColor = "green";
        if (f.update) { f.update(f.obj); }
        mtop += height;
      }
      left += width;
    }
  };

  this.num = 0;
  this.defname = function (name) {
    name = name || 'noname';
    this.num++;
    return name + '_' + this.num;
  };

  this.unselect_frames = function () {
    for (var col in this.frames) {
      for (var row in this.frames[col]) {
        var f = this.frames[col][row];
        f.selected = false;
      }
    }
  };
  this.move_frame = function (dir) {
    if (!this.curframe) {
      return;
    }
    var col = this.curframe[1];
    switch (dir) {
      case 'up':
        // move to new column
        break;
      case 'down':
        // remove from column
        // remove column if empty
        // append to previous column
        break;
      case 'right':
        if (col === this.frames.length - 1) { return false; }
        // AAAA B C DDD
        var b, c, d;
        b = this.frames[col];
        c = this.frames.splice(col);
        d = c.splice(1).slice(1);
        if (b) this.frames.push(b);
        if (c.length > 0) {
          this.frames.push(c);
        }
        for (var i = 0; i < d.length; i++) { this.frames.push(d[i]); }
        this.tile();
        break;
      case 'left':
        break;
    }
  };

  this.other_frame = function (dir) {
    if (!this.curframe) {
      return;
    }
    switch (dir) {
      case 'up':
        var col = +this.curframe[1];
        var row = +this.curframe[2];
        if (row > 0) {
          row--;
          var f = this.frames[col][row];
          this.select_frame(f.name);
          this.curframe = [f, col, row];
          this.run();
        }
        break;
      case 'down':
        var col = +this.curframe[1];
        var row = +this.curframe[2];
        if (row <= this.frames[col].length) {
          row++;
          var f = this.frames[col][row];
          if (f) {
            this.select_frame(f.name);
            this.curframe = [f, col, row];
            this.run();
          }
        }
        break;
      case 'left':
        var col = +this.curframe[1];
        if (col > 0) {
          col--;
          var f = this.frames[col][0];
          if (f) {
            this.select_frame(f.name);
            this.curframe = [f, col, 0];
            this.run();
          }
        }
        break;
      case 'right':
        var col = +this.curframe[1];
        if (col >= this.frames.length - 1) { col = -1; }
        if (col < this.frames.length) {
          col++;
          var f = this.frames[col];
          if (f) f = f[0];
          if (f) {
            this.select_frame(f.name);
            this.curframe = [f, col, 0];
            this.run();
          }
        }
        break;
    }
  };

  this.select_frame = function (name) {
    var ret = undefined;
    if (!name && this.curframe) {
      name = this.curframe[0].name;
    }
    this.oldframe = this.curframe;
    for (var col in this.frames) {
      for (var row in this.frames[col]) {
        var f = this.frames[col][row];
        if (f.name === name) {
          _('frame_' + f.name).style.backgroundColor = '#202020';
          f.selected = true;
          f.mw = true;
          ret = this.curframe = [f, col, row];
        } else {
          _('frame_' + f.name).style.backgroundColor = '#404040';
          f.mw = false;
          f.selected = false;
        }
      }
    }
    this.tile();
    return ret;
  };
  this.new_modal = function (name, body, items, cb) {
    var title = html.div('modal_title', 'modal_title', {
      backgroundColor: '#c0c0c0',
      display: 'inline',
      overflowX: 'hidden'
    });
    var these = this;
    title.appendChild(html.a('[x] ' + name, function (element) {
      self.del_frame('modal');
      obj.removeChild(element);
      self.modal.style.visibility = 'hidden';
      these.modal = null;
      alert('nul');
    }));

    var o = html.div('modal', 'modal', {
    });
    // frame body
    var p = document.createElement('p');
    if (typeof p === 'string') {
      p.innerHTML = body;
    } else {
      p.appendChild(body);
    }
    o.appendChild(title);
    o.appendChild(p);

    obj.appendChild(o);
    this.modal = o;
    this.modal = o;
    if (cb) {
      cb(self, o);
    }
    return o;
  };

  this.new_frame = function (name, body, update, pos, cb) {
    var nf = {};
    nf.name = name = name || this.defname();

    var obj_title = document.createElement('div');
    obj_title.className = 'frame_title';
    obj_title.id = 'frame_' + name;
    var d = document.createElement('div');
    d.style['overflow-x'] = 'hidden';

    var x = html.a('[x]', function () {
      self.del_frame(name);
    });
    d.appendChild(x);

    var self = this;
    var b2 = html.a('[r]', function () {
      // TODO : toggle auto refresh
      if (b2.ival) {
        clearInterval(b2.ival);
        b2.ival = null;
        b2.innerHTML = '[r]';
      } else {
        b2.innerHTML = '[R]';
        if (cb) {
          cb(self, nf);
          b2.ival = setInterval(function () {
            cb(self, nf);
          }, 1000);
        }
      }
    });
    b2.ival = null;
    d.appendChild(b2);

    var b = html.a('[@]', function () {
      if (cb) {
        cb(self, nf);
      }
    });
    d.appendChild(b);
    // nf.offset = "entry0"; //0x404981;

    var title_text = html.a(name);
    d.appendChild(title_text, function () {
      var newname = prompt('title');
      title_text.innerHTML = newname;
    });

    obj_title.appendChild(d);
    if (typeof (update) === 'string') {
      pos = update;
      update = undefined;
    }
    nf.update = update;
    nf.obj = document.createElement('div');
    var title = obj_title.outerHTML;
    nf.obj.className = 'frame';
    nf.obj.id = nf.name;
    nf.obj.appendChild(obj_title);
    var x = document.createElement('p');
    x.innerHTML = body;
    nf.obj.appendChild(obj_title);
    nf.obj.appendChild(x);
    obj.appendChild(nf.obj);
    switch (pos) {
      case 'bottom':
        // TODO: append right above the selected row
        var cc = this.curframe ? this.curframe[1] : 0;
        this.frames.push([nf]);
        this.frames[cc].push(this.frames.pop()[0]);
        break;
      case 'right':
        var col = this.curframe ? this.curframe[1] : 0;
        var a = this.frames.slice(0, col + 1);
        var b = this.frames.slice(col + 1);
        a.push([nf]);
        this.frames = a.concat(b);
        break;
      default:
        this.frames.push([nf]);
        break;
    }
    this.select_frame(name);
    if (cb) {
      cb(self, nf);
    }
    (function (self, name) {
      var f = _('frame_' + name);
      f.onmouseup = function () {
        var f = self.select_frame(name);
        if (f) {
          // f[0].obj.innerHTML = f[0].obj.innerHTML+"<br />"; //"pop";
          // alert (f[0].obj.style.backgroundColor);
        } else {
          alert('Cant find frame for ' + name);
        }
      };
    })(this, name);
    return nf;
  };
  this.update_all = function () {
    for (var col in this.frames) {
      for (var row in this.frames[col]) {
        this.frames[col][row].refresh();
      }
    }
    if (this.modal) {
      this.modal.tile();
      this.modal.refresh();
    }
    this.run();
  };
  this.del_frame = function (name) {
    var prev = undefined;
    if (!name && this.curframe) {
      name = this.curframe[0].name;
    }

    if (self.modal === this.curframe) {
      obj.removeChild(self.modal);
      this.modal = null;
      run();
      return;
    }
    for (var col in this.frames) {
      for (var row in this.frames[col]) {
        var x = this.frames[col][row];
        if (x.name === name) {
          if (x !== this.curframe[0]) { return; }
          if (this.curframe[0] !== this.oldframe[0]) { return; }
          if (this.frames[col].length > 1) {
            // remove row
            var a = this.frames[col].splice(row).slice(1);
            for (var i = 0; i < a.length; i++) { this.frames[col].push(a[i]); }
          } else {
            // remove column
            var a = this.frames.splice(col).slice(1);
            for (var i = 0; i < a.length; i++) { this.frames.push(a[i]); }
          }
          obj.removeChild(x.obj);
          if (!prev) {
            for (var col in this.frames) {
              for (var row in this.frames[col]) {
                prev = this.frames[col][row];
                break;
              }
            }
            // select next frame
          }
          this.select_frame(prev);
          // this.tile ();
          return x;
        }
        prev = x.name;
      }
    }
    this.tile();
  };
  this.run = function () {
    this.update_size();
    obj.style.position = 'absolute';
    obj.style.top = 0;
    obj.style.left = 0;
    obj.style.width = w;
    obj.style.height = h;
    obj.style.backgroundColor = '#202020';
    this.tile();
  };
}
