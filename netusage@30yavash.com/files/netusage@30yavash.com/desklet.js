//
// Network usage monitor v0.1 - 28 Sep 2013
//
// keeps track of your network usage.
// base on clem Network Usage Monitor applet.
//
// -Siavash Salemi
// 30yavash [at] gmail [dot] com
//
const Desklet = imports.ui.desklet;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Clutter = imports.gi.Clutter;
const St = imports.gi.St;
const Util = imports.misc.util;
const PopupMenu = imports.ui.popupMenu;
const GLib = imports.gi.GLib;
const NMClient = imports.gi.NMClient;

// l10n/translation
const Gettext = imports.gettext;
let UUID;

function _(str) {
    return Gettext.dgettext(UUID, str);
};


function MyDesklet(metadata){
    this._init(metadata);
}

MyDesklet.prototype = {
    __proto__: Desklet.Desklet.prototype,

    _init: function(metadata){
        Desklet.Desklet.prototype._init.call(this, metadata);

        this.metadata = metadata
        this.netDevice = this.metadata["netDevice"];

        // l10n/translation
        UUID = metadata.uuid;
        Gettext.bindtextdomain(UUID, GLib.get_home_dir() + "/.local/share/locale");

        this._deskletContainer = new St.BoxLayout({vertical:true, style_class: 'desklet-container'});

        this.imageWidget = new St.Bin({x_align: St.Align.MIDDLE});

        this._client = NMClient.Client.new();
        this._deskletContainer.add_actor(this.imageWidget);
        this.setContent(this._deskletContainer);
        this._updateWidget();
    },

    on_desklet_removed: function() {
        Mainloop.source_remove(this.timeout);
    },

    _updateWidget: function(){
        this._updateDevice();
        this._updateGraph();
        this.timeout = Mainloop.timeout_add_seconds(1, Lang.bind(this, this._updateWidget));

    },
    _updateDevice: function() {
        try {
            global.logError("device: " + this.netDevice);
            let activeConnections = this._client.get_active_connections();
            for (let i = 0; i < activeConnections.length; i++) {
                let a = activeConnections[i];
                if (a['default']) {
                    let devices = a.get_devices();
                    for (let j = 0; j < devices.length; j++) {
                        let d = devices[j];
                        if (d._delegate) {
                            this.netDevice = d.get_iface();
                            break;
                        }
                    }
                }
            }
        }
        catch (e) {
            //this.netDevice = "eth0";
            global.logError(e);
        }
    },
    _updateGraph: function() {
        try {
            //this._device = "wlan0";
            GLib.spawn_command_line_sync('vnstati -s -ne -i ' + this.netDevice + ' -o /tmp/vnstatlmapplet.png');
            let l = new Clutter.BinLayout();
            let b = new Clutter.Box();
            let c = new Clutter.Texture({keep_aspect_ratio: true, filter_quality: 2, filename: "/tmp/vnstatlmapplet.png"});
            b.set_layout_manager(l);
            b.add_actor(c);
            this.imageWidget.set_child(b);

        }
        catch (e) {
            this.warnings = new St.BoxLayout({vertical: true});
            this.missingDependencies = new St.Label({text: _("Please make sure vnstat and vnstati are installed and that the vnstat daemon is running!") 
                                  + "\n" + _("In Linux Mint, you can simply run 'apt install vnstati' and that will take care of everything.") 
                                  + "\n" + _("In other distributions it might depend on the way things are packaged but its likely to be similar.")});
            this.warnings.add(this.missingDependencies);
            this.setContent(this.warnings);
            global.logError(e);
        }

    }
}

function main(metadata, desklet_id){
    let desklet = new MyDesklet(metadata, desklet_id);
    return desklet;
}
