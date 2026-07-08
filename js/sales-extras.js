/* 业务员表单校验：是否带来 ↔ 验货时间 */
(function(){
  if (location.pathname.indexOf('sales') < 0) return;

  var tries = 0;
  var timer = setInterval(function(){
    tries++;
    if (typeof sfUpdate === 'function') {
      clearInterval(timer);
      var orig = window.sfUpdate;

      window.sfUpdate = function(id, field, value) {
        var card = document.getElementById('card_' + id);

        if (field === 'bring_goods' && (value === true || value === 'true')) {
          if (card) {
            var inp = card.querySelector('input[type="date"]');
            if (inp && !inp.value) {
              if (typeof showToast === 'function') showToast('请先选择验货时间（货什么时候带来？）', 'warning');
              return;
            }
          }
        }

        if (field === 'inspection_date' && value) {
          if (card) {
            var sel = card.querySelector('select');
            if (sel && sel.value !== 'true') {
              if (typeof showToast === 'function') showToast('请确保已选择是否带来：是', 'warning');
              return;
            }
          }
        }

        return orig(id, field, value);
      };
    }
    if (tries > 30) clearInterval(timer);
  }, 200);
})();
