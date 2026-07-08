/* 业务员表单校验：是否带来 ↔ 验货时间 */
(function(){
  if (location.pathname.indexOf('sales') < 0) return;

  function getCard(id) { return document.getElementById('card_' + id); }

  /* 拦截所有change事件，在捕获阶段优先判断 */
  document.addEventListener('change', function(e){
    var el = e.target;
    if (!el) return;

    /* 是否带来select变动 */
    if (el.tagName === 'SELECT' && el.closest('[id^="card_"]')) {
      if (el.value === 'true') {
        var card = el.closest('[id^="card_"]');
        var inp = card.querySelector('input[type="date"]');
        if (inp && !inp.value) {
          e.stopImmediatePropagation();
          el.value = '';
          if (typeof showToast === 'function') showToast('请先选择验货时间（货什么时候带来？）', 'warning');
          return;
        }
      }
    }

    /* 验货时间变动 */
    if (el.type === 'date' && el.closest('[id^="card_"]')) {
      if (el.value) {
        var card = el.closest('[id^="card_"]');
        var sel = card.querySelector('select');
        if (sel && sel.value !== 'true') {
          e.stopImmediatePropagation();
          el.value = '';
          if (typeof showToast === 'function') showToast('请确保已选择是否带来：是', 'warning');
        }
      }
    }
  }, true);
})();
