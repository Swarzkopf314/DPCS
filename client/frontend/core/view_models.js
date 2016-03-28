function getCrashGroups() {
    var crashGroups = Repository.CrashGroups;
    var crashReports = Enumerable.From(Repository.CrashReports);
    var solutions = Enumerable.From(Repository.Solutions);

    for (var i = 0; i < crashGroups.length; i++) {
        var cg = crashGroups[i];
        cg.GroupId = crashGroups[i].crash_group_id;
        cg.crashReports = crashReports
            .Where(
                function (crash) {
                    return crash.crash_report.crash_group_id === cg.crash_group_id;
                })
            .ToArray();
    }

    return Enumerable.From(crashGroups)
        .Select(
            function (cg) {
                return new CrashGroupDetailsVM(cg);
            })
        .ToArray();
}

function getUnassignedReports() {
    var crashReports = Enumerable.From(Repository.CrashReports)
        .Where(
            function (crash) {
                return !crash["crash_report"]["crash_group_id"];
            }
        )
        .Select(
            function (crash) {
                return new CrashVM(crash.crash_report);
            }
        )
        .ToArray();
    return crashReports;
}

function MainViewModel() {
    var self = this;

    self.crashGroupsData = ko.observableArray(getCrashGroups());

    self.crashReportsData = ko.observableArray(getUnassignedReports());

    self.selectedCrashGroup = ko.observable();

    self.assignReport = function (report) {
        var crashGroups = Enumerable.From(Repository.CrashGroups);
        self.selectedId = self.selectedCrashGroup();
        self.crashGroupUrl = crashGroups.First(function (crashGroup) {
            return crashGroup.crash_group_id == self.selectedId
        })["crash_group_url"];

        $.ajax({
                url: "http://private-anon-71b931be7-dpcs.apiary-mock.com/vd1/crash-reports/" + report.id,
                type: "GET",
            })
            .done(function (response) {
                response["crash_report"]["crash_group_id"] = self.selectedId
                response["crash_report"]["crash_group_url"] = self.crashGroupUrl
                $.ajax({
                        url: "http://private-anon-71b931be7-dpcs.apiary-mock.com/vd1/crash-reports/" + report.id,
                        type: "PUT",
                        data: {
                            "crash_report": response
                        }
                    })
                    .done(function (response, textStatus, jqXHR) {
                        if (jqXHR.status == 200) {
                            self.crashReportsData.remove(report)
                        }
                    });
            });
    }

    self.CrashToAdd = ko.observable(new CrashVM({}));

    self.AddCrash = function () {
        self.CrashToAdd(new CrashVM({}))
        $('#add-crash-modal').modal('show');
    }

    self.SendCrash = function () {

        var crashReport = {
            "application": {
                "name": self.CrashToAdd().Application().Name(),
                "version": self.CrashToAdd().Application().Version()
            },
            "system_info": {
                "version": self.CrashToAdd().SystemInfo().Version()
            },
            "exit_code": self.CrashToAdd().ExitCode(),
            "stderr_output": self.CrashToAdd().StderrOutput()
        };

        $.ajax({
                url: "http://private-anon-71b931be7-dpcs.apiary-mock.com/vd1/crash-reports/",
                type: "POST",
                data: {
                    "crash_report": crashReport
                }
            })
            .done(function (response) {
                var data = $.extend(crashReport, response.crash_report_ack);
                self.Crashes.push(new CrashVM(data));
                $('#add-crash-modal').modal('hide');
            });
    }

    self.SendCrashGroup = function () {

        var crashGroup = {

        };

        $.ajax({
                url: "http://private-anon-7dff37ec3-dpcs.apiary-mock.com/vd1/crash-groups",
                type: "PUT"
            })
            .done(function (response) {
                var data = $.extend(crashGroup, response);
                var g = new GroupVM(data);
                g.count = 0;
                g.hasSolution = false;
                self.crashGroupsData.push(g);
            });
    }

    self.GroupToView = ko.observable(new CrashGroupDetailsVM({}));

    self.ViewCrashGroup = function (group) {
        self.GroupToView(ko.observable(new CrashGroupDetailsVM(group)));
        $('#crash-group-details-modal').modal('show');
    }
}

function GroupVM(data) {
    var self = this;

    self.GroupId = ko.observable(data.crash_group_id || "");
    self.GroupUrl = ko.observable(data.crash_group_url || "");

    self.GroupId = data.crash_group_id;
    self.GroupUrl = data.crash_group_url;

    var solution = data.solution;

    if (solution) {
        self.Solution = ko.observable(new SolutionVM(solution.solution));

    }
}

function CrashGroupDetailsVM(data) {
    var self = this;

    self.GroupId = data.GroupId;

    var solution = Enumerable.From(Repository.Solutions)
        .FirstOrDefault(
            null,
            function (solution) {
                return solution["solution"]["crash_group_id"] === self.GroupId;
            });

    if (solution) {
        self.Solution = ko.observable(new SolutionVM(solution.solution));
        self.SolutionName = solution.solution.shell_script;
    }

    self.Crashes = Enumerable.From(Repository.CrashReports)
        .Where(
            function (crash) {
                return crash["crash_report"]["crash_group_id"] == self.GroupId;
            }
        )
        .Select(
            function (crash) {
                return new CrashVM(crash.crash_report);
            }
        )
        .ToArray();
    self.Count = self.Crashes.length;
}

function SolutionVM(data) {
    var self = this;

    self.SolutionId = ko.observable(data.solution_id || "");
    self.SolutionUrl = ko.observable(data.crash_report_url || "");
    self.Group = ko.observable();
    self.ShellScript = ko.observable(data.shell_script || "");
}

function CrashVM(data) {
    var self = this;
    
    self.ReportId = ko.observable(data.crash_report_id || "");
    self.ReportUrl = ko.observable(data.crash_report_url || "");
    self.Group = ko.observable();
    self.ExitCode = ko.observable(data.exit_code || "");
    self.StderrOutput = ko.observable(data.stderr_output || "");

    self.Application = ko.observable({
        Name: ko.observable((data.application && data.application.name) || ""),
        Version: ko.observable((data.application && data.application.version) || "")
    });
    self.SystemInfo = ko.observable({
        Version: ko.observable((data.system_info && data.system_info.version) || "")
    });

    //functions
    self.Edit = function () {
        alert("edit1");
    }

    //ctor
    $.get("http://private-anon-71b931be7-dpcs.apiary-mock.com/vd1/crash-groups/" + data.crash_group_id, {}, function (response) {
        self.Group(new GroupVM(response));
    });
}

// Overall viewmodel for this screen, along with initial state
function CrashesVM() {
    var self = this;

    // Properties
    self.Crashes = ko.observableArray([]);

    self.CrashToAdd = ko.observable(new CrashVM({}));

    //functions
    self.Remove = function (item) {
        $.ajax({
                url: "http://private-anon-71b931be7-dpcs.apiary-mock.com/vd1/crash-reports/" + item.ReportId(),
                type: 'DELETE'
            })
            .done(function () {
                self.Crashes.remove(item);
            })
            .fail(function () {
                alert("Cannot remove crash report with Id: " + item.ReportId());
            });
    }


    self.AddCrash = function () {
        self.CrashToAdd(new CrashVM({}))
        $('#add-crash-modal').modal('show');
    }

    self.SendCrash = function () {

        var crashReport = {
            "application": {
                "name": self.CrashToAdd().Application().Name(),
                "version": self.CrashToAdd().Application().Version()
            },
            "system_info": {
                "version": self.CrashToAdd().SystemInfo().Version()
            },
            "exit_code": self.CrashToAdd().ExitCode(),
            "stderr_output": self.CrashToAdd().StderrOutput()
        };

        $.ajax({
                url: "http://private-anon-71b931be7-dpcs.apiary-mock.com/vd1/crash-reports/",
                type: "POST",
                data: {
                    "crash_report": crashReport
                }
            })
            .done(function (response) {
                var data = $.extend(crashReport, response.crash_report_ack);
                self.Crashes.push(new CrashVM(data));
                $('#add-crash-modal').modal('hide');
            });
    }

    //ctor
    $.get("http://private-anon-71b931be7-dpcs.apiary-mock.com/vd1/crash-reports/", {}, function (data) {
        var crashes = Enumerable.From(data)
            .Select(function (x) {
                return new CrashVM(x.crash_report)
            })
            .ToArray();
        self.Crashes(crashes);
    });

}