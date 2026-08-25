// User master screen
$(function () {
    var ROLES = {1: 'Admin', 2: 'Stock Manager', 3: 'Branch User'};

    function showMsg(ok, text) {
        $('#msg').removeClass('ok err').addClass(ok ? 'ok' : 'err').text(text).show();
    }
    
        function clearForm() {
    $('#hidId').val('0');
    $('#txtName').val(''); $('#txtDisplay').val('');
    $('#selType').val('3'); $('#txtPassword').val('');
    $('#mobile').val(''); $('#addr').val('');   // ← add this line
    $('#txtName').focus();
    }

    var tbl = $('#tbl').DataTable({
        serverSide: true,
        ajax: {url: '/user/list/', type: 'GET'},
        columns: [
            {data: 'pk_user_id'},
            {data: 'vhr_user_name'},
            {data: 'vhr_display_name'},
            {data: 'sin_user_type', render: function (d) { return ROLES[d] || d; }},
            {data: null, orderable: false, render: function (row) {
                return '<span class="act edit" data-id="' + row.pk_user_id + '">Edit</span>' +
                       '<span class="act del" data-id="' + row.pk_user_id +
                       '" data-name="' + row.vhr_user_name + '">Delete</span>';
            }}
        ]
    });

    $('#btnNew').on('click', clearForm);

    $('#btnSave').on('click', function () {
    $.post('/user/save/', {
        pk_user_id:       $('#hidId').val(),
        vhr_user_name:    $('#txtName').val(),
        vhr_display_name: $('#txtDisplay').val(),
        sin_user_type:    $('#selType').val(),
        vhr_password:     $('#txtPassword').val(),
        vhr_mobile:       $('#mobile').val(),    // ← add this
        vhr_address:      $('#addr').val()       // ← add this
    }).done(function (r) {
            if (r.blnSuccess) { showMsg(true, r.strMessage); clearForm(); tbl.ajax.reload(); }
            else showMsg(false, Object.values(r.dctError).flat().join(' '));
        });
    });

    // edit: pull the row data straight from the table
    $('#tbl tbody').on('click', '.edit', function () {
    var row = tbl.row($(this).closest('tr')).data();
    $('#hidId').val(row.pk_user_id);
    $('#txtName').val(row.vhr_user_name);
    $('#txtDisplay').val(row.vhr_display_name);
    $('#selType').val(row.sin_user_type);
    $('#txtPassword').val('');
    $('#mobile').val(row.vhr_mobile || '');   // ← add
    $('#addr').val(row.vhr_address || '');    // ← add
    showMsg(true, 'Editing "' + row.vhr_user_name + '" - leave password blank to keep it.');
});

    $('#tbl tbody').on('click', '.del', function () {
        var id = $(this).data('id'), name = $(this).data('name');
        if (!confirm('Delete user "' + name + '"?')) return;
        $.ajax({url: '/user/delete/', type: 'POST', contentType: 'application/json',
                data: JSON.stringify({pk_user_id: id})})
         .done(function (r) {
            if (r.blnSuccess) { showMsg(true, r.strMessage); tbl.ajax.reload(); }
            else showMsg(false, Object.values(r.dctError).flat().join(' '));
         });
    });
});
