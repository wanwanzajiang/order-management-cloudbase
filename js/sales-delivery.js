// ========== 业务员送货时间输入 ==========
(function(){
  'use strict';

  // 全局暂存：在渲染前存入，enhanceCards 读取，避免时序问题
  window._deliveryDates = window._deliveryDates || {};

  var _renderResults = renderResults;
  renderResults = function(orders){
    // 先存 delivery_date 到全局 map（在渲染前）
    if (orders) {
      orders.forEach(function(o){
        window._deliveryDates[o._id || o.id] = o.delivery_date || '';
      });
    }
    _renderResults(orders);
    // 渲染后补充更新 card dataset + 已创建的 input
    setTimeout(function(){
      if (!orders) return;
      orders.forEach(function(o){
        var id = o._id || o.id;
        var card = document.getElementById('card_' + id);
        if (!card) return;
        card.dataset.deliveryDate = o.delivery_date || '';
        // 如果 enhanceCards 已经创建了 input，补填值
        var inp = card.querySelector('.dv-delivery-row input[type="date"]');
        if (inp && !inp.value && o.delivery_date) {
          inp.value = o.delivery_date;
          inp._saved = o.delivery_date;
        }
      });
    }, 250);
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

      // 从全局 map 或 dataset 获取已保存的送货时间
      var savedDate = window._deliveryDates[id] || card.dataset.deliveryDate || '';

      // 添加送货时间输入
      var actSection = card.querySelector('.oc-actions');
      if(actSection && !card.querySelector('.dv-delivery-row')){
        var row = document.createElement('div');
        row.className = 'dv-delivery-row';
        row.style.cssText = 'font-size:12px;padding:6px 0;border-top:1px dashed #e0e0e0;margin-top:4px;';
        row.innerHTML = '<b style="font-size:12px;">📅 送货时间：</b> ';
        var dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.style.cssText = 'font-size:12px;padding:2px 6px;border:1px solid #ccc;border-radius:4px;width:130px;' + (savedDate ? 'font-weight:700;color:#e67e22;background:#fff8f0;border-color:#e67e22;' : '');
        dateInput.value = savedDate;
        dateInput._saved = savedDate;

        var doSave = function(val){
          var v = val || null;
          dateInput._saved = v;
          window._deliveryDates[id] = v || '';
          if(v){ dateInput.style.cssText += 'font-weight:700;color:#e67e22;background:#fff8f0;border-color:#e67e22;'; }
          else { dateInput.style.cssText = 'font-size:12px;padding:2px 6px;border:1px solid #ccc;border-radius:4px;width:130px;'; }
          API.updateOrder(id, {delivery_date: v, has_new_photo: false}).then(function(r){
            if(r.error) showToast('保存失败: ' + (r.error.message || '权限不足'), 'error');
          }).catch(function(e){
            showToast('保存异常: ' + (e.message || '网络错误'), 'error');
          });
        };

        dateInput.onblur = function(){
          if(this.value !== this._saved) doSave(this.value);
        };
        dateInput.addEventListener('change', function(){
          if(this.value !== this._saved) doSave(this.value);
        });

        row.appendChild(dateInput);
        actSection.parentNode.insertBefore(row, actSection.nextSibling);
      }
    });
  }

  setTimeout(enhanceCards, 500);

  var container = document.getElementById('resultContainer') || document.body;
  var observer = new MutationObserver(function(){ enhanceCards(); });
  observer.observe(container, { childList: true, subtree: true });
})();
