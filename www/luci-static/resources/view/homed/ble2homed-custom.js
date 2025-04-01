'use strict';
'require view';
'require fs';
'require ui';
var isReadonlyView = !L.hasViewPermission() || null;
return view.extend({
    load: function() {
        return L.resolveDefault(fs.read('/etc/ble2homed-custom/config.json'), '');
    },
    handleSave: function(ev) {
        var value = (document.querySelector('textarea').value || '');
        return fs.write('/etc/ble2homed-custom/config.json', value).then(function(rc) {
            document.querySelector('textarea').value = value;
            ui.addNotification(null, E('p', _('Configuration have been succesfully saved!')), 'info');
        }).catch(function(e) {
            ui.addNotification(null, E('p', _('Unable to save configuration: %s').format(e.message)));
        });
    },
    render: function(configuration) {
        return E([E('h2', _('Ble2homed-custom Service Configuration')), E('p', {
            'class': 'cbi-section-descr'
        }, _('Documentation can be found <a href="https://community.homed.dev/d/29-ble-2-homed" target="_blank">here</a>.')), E('p', {}, E('textarea', {
            'style': 'width:100%',
            'rows': 25,
            'disabled': isReadonlyView
        }, [configuration != null ? configuration : '']))]);
    },
    handleSaveApply: null,
    handleReset: null
});