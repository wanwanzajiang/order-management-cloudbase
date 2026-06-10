// ========== 业务员送货时间输入 ==========
(function(){
  'use strict';

  // monkey-patch renderResults: 把 delivery_date 存到 card 的 dataset 上
  var _renderResults = renderResults;
  renderResults = function(orders){
    _renderResults(orders);
    setTimeout(function(){
      if (!orders) return;
      orders.forEach(function(o){
        var card = document.getElementById('card_' + (o._id || o.id));
        if (card) card.dataset.deliveryDate = o.delivery_date || '';
      });
    }, 50);
  };

  function enhanceCards(){
    document.querySelectorAll('.order-card').forEach(function(card){
      if(card.dataset.delivery) return;
      card.dataset.delivery = '1';

      // 提取订单 ID
      var id = '';
      var attrs = card.querySelectorAll('[onchange]');
      for(var j = 0; j < attrs.length; j++){
        var m = attrs[j].getAttribute('onchange') || '';
        var match = m.match(/sfUpdate\('([^']+)'/);
        if(match){ id = match[1]; break; }
      }
      if(!id) return;

      // 获取已保存的送货时间
      var savedDate = card.dataset.deliveryDate || '';

      // 添加送货时间输入
      var actSection = card.querySelector('.oc-actions');
      if(actSection && !card.querySelector('.dv-delivery-row')){
        var row = document.createElement('div');
        row.className = 'dv-delivery-row';
        row.style.cssText = 'font-size:12px;padding:6px 0;border-top:1px dashed #e0e0e0;margin-top:4px;';
        row.innerHTML = '<b style="font-size:12px;">📅 送货时间：</b> ';
        var dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.style.cssText = 'font-size:12px;padding:2px 6px;border:1px solid #ccc;border-radius:4px;width:130px;';
        dateInput.value = savedDate;
        dateInput._saved = savedDate;

        // 用 onblur 保存（比 onchange 更可靠）
        dateInput.onblur = function(){
          if(this.value !== this._saved){
            this._saved = this.value;
            sfUpdate(id, 'delivery_date', this.value || null);
          }
        };
        // change 作为补充（日期选择器关闭时也会触发）
        dateInput.addEventListener('change', function(){
          if(this.value !== this._saved){
            this._saved = this.value;
            sfUpdate(id, 'delivery_date', this.value || null);
          }
        });

        row.appendChild(dateInput);
        actSection.parentNode.insertBefore(row, actSection.nextSibling);
      }
    });
  }

  // 初始执行
  setTimeout(enhanceCards, 500);

  // 监听 DOM 变化
  var container = document.getElementById('resultContainer') || document.body;
  var observer = new MutationObserver(function(){
    enhanceCards();
  });
  observer.observe(container, { childList: true, subtree: true });
})();
