/* 业务员表单校验：是否带来 ↔ 验货时间 */
(function(){
  if (location.pathname.indexOf('sales') < 0) return;

  var tries = 0;
  var timer = setInterval(function(){
    tries++;
    if (typeof sfUpdate === 'function') {
      clearInterval(timer);
      var orig = sfUpdate;

      window.sfUpdate = function(e, t, n) {
        /* 选"是否带来=是"时，检查验货时间 */
        if (t === 'bring_goods' && (n === true || n === 'true')) {
          var card = document.getElementById('card_' + e);
          if (card) {
            var insp = card.querySelector('[onchange*="inspection_date"]');
            if (insp && !insp.value) {
              if (typeof showToast === 'function') {
                showToast('请先选择验货时间（货什么时候带来？）', 'warning');
              }
              return;
            }
          }
        }

        /* 填验货时间时，检查是否带来 */
        if (t === 'inspection_date' && n) {
          var card = document.getElementById('card_' + e);
          if (card) {
            var bg = card.querySelector('[onchange*="bring_goods"]');
            if (!bg) bg = card.querySelector('select'); /* fallback */
            if (bg && bg.value !== 'true') {
              if (typeof showToast === 'function') {
                showToast('请确保已选择是否带来：是', 'warning');
              }
              return;
            }
          }
        }

        orig(e, t, n);
      };
    }
    if (tries > 30) clearInterval(timer);
  }, 200);
})();
