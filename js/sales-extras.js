/* 业务员表单校验：是否带来 ↔ 验货时间 */
(function(){
  if (location.pathname.indexOf('sales') < 0) return;

  var lock = false;

  document.addEventListener('change', function(e){
    if (lock) return;
    var el = e.target;
    var card = el.closest('[id^="card_"]');
    if (!card) return;

    var inp = card.querySelector('input[type="date"]');
    var sel = card.querySelector('select');

    /* 是否带来选"是" → 必须有验货时间 */
    if (el === sel && el.value === 'true') {
      if (inp && !inp.value) {
        lock = true;
        el.value = '';
        showToast('请先选择验货时间（货什么时候带来？）', 'warning');
        setTimeout(function(){ lock = false; }, 300);
      }
    }

    /* 选验货时间 → 必须已选"是否带来=是" */
    if (el === inp && el.value) {
      if (sel && sel.value !== 'true') {
        lock = true;
        el.value = '';
        showToast('请确保已选择是否带来：是', 'warning');
        setTimeout(function(){ lock = false; }, 300);
      }
    }
  }, true);
})();
