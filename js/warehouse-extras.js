/* 业务员筛选下拉 */
function populateSpSelect(){
  var sel = document.getElementById('filterSp');
  if (!sel || sel.options.length > 1) return;
  DB.collection(COL.ORDERS).limit(2000).get().then(function(r){
    var names = {};
    (r.data||[]).forEach(function(o){ if(o.salesperson_name) names[o.salesperson_name]=1; });
    Object.keys(names).sort().forEach(function(n){
      var opt = document.createElement('option');
      opt.value = n; opt.textContent = n;
      sel.appendChild(opt);
    });
  }).catch(function(){});
}

/* 注入业务员筛选到loadOrders */
(function(){
  var ready = setInterval(function(){
    if (typeof loadOrders === 'function' && typeof init === 'function'){
      clearInterval(ready);
      var _orig = loadOrders;
      window.loadOrders = async function(){
        populateSpSelect();
        return _orig();
      };
      loadOrders();
    }
  }, 200);
})();
