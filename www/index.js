import $ from 'https://cdn.skypack.dev/jquery';
import r2 from './lib/r2';

var filename = "";
var layout = "";
var project = "";
var fortune = "";

$("#fortune").on('click', function () {
    r2.cmd("fortune", function (x) {
        $("#fortune").html("<q><i>" + x + "</i></q>");
    });
});
$(document).ready(function () {
    function updateProjectList() {
        window.location.assign("/");
    }
    r2.cmdj("Plj", function (x) {
        var html = "<ul>";
        for (var i in x) {
            var filename = x[i].trim();
            html += "<li class='layout_value' id='" + filename + "'>" + filename + "</li>";
        }
        html += "</ul>";
        $("#recent").html(html);
    });

    r2.cmd("e http.ui", function (x) {
        layout = x.trim();
        $("select#dropdown").val(layout);
    });

    r2.cmdj("oj", function (x) {
        if (x) {
            if (x[0].uri.indexOf("malloc://") !== -1) {
                $("#openfile").html('<input type="file" id="filename" name="filename">');
            } else {
                $("#openfile").html(x[0].uri);
                filename = x[0].uri;
            }
        }
    });
    r2.cmd("Po", function (x) {
        $("#openproject").html(x);
    });

    r2.cmd("fortune", function (x) {
        $("#fortune").html("<q><i>" + x + "</i></q>");
    });

    $('#filename').on('change', function () {
        filename = $('#filename').val();
    });

    $('.layout_value').on('click', function () {
        $('.highlight').removeClass('highlight');
        project = this.id;
        $("#" + project).addClass('highlight');
        switch (project) {
            case "openfile":
            case "openproject":
                project = "";
                break;
        }
    });

    $('#dropdown').on('change', function () {
        layout = $(this).val();
        r2.cmd(":e http.ui=" + layout, function (x) { });
    });

    $('#logo').on('click', function () {
        window.location.assign("./" + layout);
    })
    $('#saveas').on('click', function () {
        var prjname = prompt("Project Name", project);
        if (prjname) {
            r2.cmd("Ps " + prjname, function () {
                updateProjectList();
            })
        }
    });
    $('#save').on('click', function () {
        var prjname = prompt("Project Name");
        if (prjname) {
            r2.cmd("Po", function (x) {
                if (!x) {
                    x = prompt("Project Name");
                }
                if (x) {
                    r2.cmd("Ps " + x, function () {
                        updateProjectList();
                    });

                }
            });
        }
    });
    $('#delete').on('click', function () {
        if (project != "") {
            r2.cmd("Pd " + project, function () {
                updateProjectList();
                alert("Project " + project + " deleted");
                project = "";
            });
        } else {
            alert("First select a project");
        }
    });
    $('#newfile').on('click', function () {
        var path = $('#newfile_path').val();
        r2.cmd(":e file.project=;o--;o " + path, function () {
            window.location.assign("./" + layout);
        });
    });
    $('#submit').on('click', function () {
        if (project == "openfile" || project == "openproject") { // if curfile selected
            window.location.assign("./" + layout);
        } else if (project !== "" && layout !== "") {
            r2.cmd("Po " + project, function (x) { });
            window.location.assign("./" + layout);
        } else if (filename !== "" && layout !== "") {
            window.location.assign("./" + layout);
        } else {
            alert("Choose file and layout");
        }
    });
});
