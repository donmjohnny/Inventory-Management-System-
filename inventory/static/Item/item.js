// Item master screen (worked example - copy this for new modules)
$(function () {
    function showMsg(ok, text) {
        $('#msg').removeClass('ok err').addClass(ok ? 'ok' : 'err').text(text).show();
    }
    function clearForm() {
        $('#hidId').val('0');
        $('#txtCode').val(''); $('#txtName').val('');
        $('#txtCategory').val(''); $('#txtUnit').val('');
        $('#txtReorder').val('0'); $('#txtCost').val('0');
        $('#txtCode').focus();
    }

    var tbl = $('#tbl').DataTable({
        serverSide: true,
        ajax: {url: '/item/list/', type: 'GET'},
        columns: [
            {data: 'pk_item_id'},
            {data: 'vhr_item_code'},
            {data: 'vhr_item_name'},
            {data: 'vhr_category'},
            {data: 'vhr_unit'},
            {data: 'dbl_reorder_level'},
            {data: 'dbl_standard_cost'},
            {data: null, orderable: false, render: function (row) {
                return '<span class="act edit" data-id="' + row.pk_item_id + '">Edit</span>' +
                       '<span class="act del" data-id="' + row.pk_item_id +
                       '" data-name="' + row.vhr_item_code + '">Delete</span>';
            }}
        ]
    });

    $('#btnNew').on('click', clearForm);

    $('#btnSave').on('click', function () {
        $.post('/item/save/', {
            pk_item_id: $('#hidId').val(),
            vhr_item_code: $('#txtCode').val(),
            vhr_item_name: $('#txtName').val(),
            vhr_category: $('#txtCategory').val(),
            vhr_unit: $('#txtUnit').val(),
            dbl_reorder_level: $('#txtReorder').val(),
            dbl_standard_cost: $('#txtCost').val()
        }).done(function (r) {
            if (r.blnSuccess) { showMsg(true, r.strMessage); clearForm(); tbl.ajax.reload(); }
            else showMsg(false, Object.values(r.dctError).flat().join(' '));
        });
    });

    $('#tbl tbody').on('click', '.edit', function () {
        var row = tbl.row($(this).closest('tr')).data();
        $('#hidId').val(row.pk_item_id);
        $('#txtCode').val(row.vhr_item_code);
        $('#txtName').val(row.vhr_item_name);
        $('#txtCategory').val(row.vhr_category);
        $('#txtUnit').val(row.vhr_unit);
        $('#txtReorder').val(row.dbl_reorder_level);
        $('#txtCost').val(row.dbl_standard_cost);
        showMsg(true, 'Editing item "' + row.vhr_item_code + '".');
    });

    $('#tbl tbody').on('click', '.del', function () {
        var id = $(this).data('id'), name = $(this).data('name');
        if (!confirm('Delete item "' + name + '"?')) return;
        $.ajax({url: '/item/delete/', type: 'POST', contentType: 'application/json',
                data: JSON.stringify({pk_item_id: id})})
         .done(function (r) {
            if (r.blnSuccess) { showMsg(true, r.strMessage); tbl.ajax.reload(); }
            else showMsg(false, Object.values(r.dctError).flat().join(' '));
         });
    });
});
