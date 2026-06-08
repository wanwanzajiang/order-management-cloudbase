// ========== 业务员送货时间 + 已送出/已收回 只读优化 ==========
(function(){
  'use strict';

  function enhanceCards(){
    document.querySelectorAll('.order-card').forEach(function(card){
      if(card.dataset.enhanced) return;
      card.dataset.enhanced = '1';

      // 1. 把「验货」的 date input 改成只读「已送出」显示
      var inputs = card.querySelectorAll('input[type="date"]');
      for(var i = 0; i < inputs.length; i++){
        var inp = inputs[i];
        var label = inp.closest('label');
        if(!label) continue;
        var text = label.textContent || '';

        if(text.indexOf('验货') >= 0 || text.indexOf('已送出') >= 0){
          var val = inp.value;
          var span = document.createElement('span');
          span.style.cssText = 'font-size:12px;padding:2px 4px;border-radius:4px;';
          span.textContent = '已送出：' + (val || '-');
          label.innerHTML = '';
          label.appendChild(span);
        }
        else if(text.indexOf('收回') >= 0 || text.indexOf('已收回') >= 0){
          var val2 = inp.value;
          var span2 = document.createElement('span');
          span2.style.cssText = 'font-size:12px;padding:2px 4px;border-radius:4px;';
          span2.textContent = '已收回：' + (val2 || '-');
          label.innerHTML = '';
          label.appendChild(span2);
        }
      }

      // 2. 提取订单 ID
      var id = '';
      var attrs = card.querySelectorAll('[onclick]');
      for(var j = 0; j < attrs.length; j++){
        var m = attrs[j].getAttribute('onclick') || '';
        var match = m.match(/sfUpdate\('([^']+)'/);
        if(match){ id = match[1]; break; }
      }
      if(!id) return;

      // 3. 添加送货时间输入
      var infoSection = card.querySelector('.oc-info') || card.querySelector('.order-card > div:nth-child(3)');
      if(infoSection && !card.querySelector('.dv-delivery-row')){
        var row = document.createElement('div');
        row.className = 'dv-delivery-row';
        row.style.cssText = 'font-size:12px;padding-top:4px;margin-top:4px;border-top:1px dashed #e0e0e0;display:flex;align-items:center;gap:6px;';
        row.innerHTML = '<b style="font-size:12px;">📅 送货时间：</b>';
        var dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.style.cssText = 'font-size:12px;padding:2px 6px;border:1px solid #ccc;border-radius:4px;width:130px;';
        dateInput.onchange = function(){
          sfUpdate(id, 'delivery_date', this.value || null);
        };
        row.appendChild(dateInput);
        infoSection.parentNode.insertBefore(row, infoSection.nextSibling);
      }
    });
  }

  // 初始执行
  enhanceCards();

  // 监听 DOM 变化
  var container = document.getElementById('resultContainer') || document.body;
  var observer = new MutationObserver(function(){
    enhanceCards();
  });
  observer.observe(container, { childList: true, subtree: true });
})();
