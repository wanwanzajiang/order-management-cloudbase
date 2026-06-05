(function(){
var _sr=showOrders||function(){};
var done=!1;
function inject(){
  document.querySelectorAll('.order-card').forEach(function(c){
    if(c.querySelector('.dv-inject'))return;
    var h=c.querySelector('.oc-header');
    if(!h||h.textContent.indexOf('已到货')<0)return;
    var btns=c.querySelectorAll('[onclick]');
    var id='';
    for(var i=0;i<btns.length;i++){
      var m=btns[i].getAttribute('onclick').match(/sfUpdate\('([^']+)'/);
      if(m){id=m[1];break;}
    }
    if(!id)return;
    var d=document.createElement('div');
    d.className='dv-inject';
    d.style.cssText='font-size:12px;margin:4px 0;padding:4px 0;border-top:1px dashed #e0e0e0';
    var inp=document.createElement('input');
    inp.type='date';inp.style.cssText='font-size:11px;padding:2px 5px;border:1px solid #ccc;border-radius:4px;width:120px';
    inp.onchange=function(){sfUpdate(id,'delivery_date',this.value||null)};
    d.innerHTML='<b>送货时间：</b> ';
    d.appendChild(inp);
    var bar=c.querySelector('.oc-actions');
    if(bar)bar.parentNode.insertBefore(d,bar);
    else c.appendChild(d);
  });
}
setInterval(inject,800);
})();
