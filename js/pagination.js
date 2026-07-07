/* 客户端分页 - 不修改inline脚本 */
(function(){
  if (location.pathname.indexOf('warehouse') < 0) return;

  var _allData = [];
  var _page = 1;
  var _pageSize = 10;

  function renderPager(total, container) {
    var totalPages = Math.ceil(total / _pageSize) || 1;
    if (totalPages <= 1) {
      var oldPager = document.getElementById('__pager');
      if (oldPager) oldPager.remove();
      return;
    }
    var html = '<div id="__pager" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 0;flex-wrap:wrap;font-size:12px;color:#555">';
    html += '<button style="padding:4px 10px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer" onclick="PAGE.go('+(_page-1)+')" ' + (_page<=1?'disabled':'') + '>上一页</button>';
    for (var i = 1; i <= totalPages; i++) {
      if (totalPages <= 7 || i === 1 || i === totalPages || Math.abs(i - _page) <= 1) {
        html += '<button style="padding:4px 10px;border:1px solid ' + (i===_page?'#667eea':'#ddd') + ';border-radius:4px;background:' + (i===_page?'#667eea':'#fff') + ';color:' + (i===_page?'#fff':'#555') + ';cursor:pointer;font-weight:' + (i===_page?'600':'400') + '" onclick="PAGE.go('+i+')">' + i + '</button>';
      } else if (i === 2 || i === totalPages - 1) {
        html += '<span style="color:#ccc">...</span>';
      }
    }
    html += '<button style="padding:4px 10px;border:1px solid #ddd;border-radius:4px;background:#fff;cursor:pointer" onclick="PAGE.go('+(_page+1)+')" ' + (_page>=totalPages?'disabled':'') + '>下一页</button>';
    html += '<span style="margin-left:8px">共 ' + total + ' 条</span>';
    html += '<select onchange="PAGE.size(this.value)" style="margin-left:4px;padding:3px 6px;border:1px solid #ddd;border-radius:4px;font-size:11px;cursor:pointer">';
    [10, 20, 50, 100].forEach(function(s) {
      html += '<option value="' + s + '" ' + (s === _pageSize ? 'selected' : '') + '>' + s + '条/页</option>';
    });
    html += '</select></div>';

    var old = document.getElementById('__pager');
    if (old) old.remove();
    var wrapper = container.closest('.table-wrapper') || container.parentElement;
    var div = document.createElement('div');
    div.innerHTML = html;
    wrapper.appendChild(div.firstChild);
  }

  window.PAGE = {
    go: function(p) {
      var total = Math.ceil(_allData.length / _pageSize) || 1;
      if (p < 1 || p > total) return;
      _page = p;
      var sliced = _allData.slice((_page-1)*_pageSize, _page*_pageSize);
      if (typeof renderOrders === 'function') {
        // Call original renderOrders (before our wrapper)
        if (window.__origRenderOrders) {
          window.__origRenderOrders(sliced);
        }
      }
      // Re-enhance arrival tracking
      if (typeof enhanceProductCells === 'function') {
        setTimeout(enhanceProductCells, 100);
      }
      renderPager(_allData.length);
      window.scrollTo(0, 0);
    },
    size: function(s) {
      _pageSize = parseInt(s) || 10;
      _page = 1;
      PAGE.go(1);
    }
  };

  /* Monkey-patch renderOrders */
  var tries = 0;
  var timer = setInterval(function(){
    tries++;
    if (typeof renderOrders === 'function') {
      clearInterval(timer);
      window.__origRenderOrders = renderOrders;
      window.renderOrders = function(data) {
        _allData = data || [];
        _page = 1;
        var sliced = _allData.slice(0, _pageSize);
        window.__origRenderOrders(sliced);
        setTimeout(function() {
          renderPager(_allData.length);
          if (typeof enhanceProductCells === 'function') enhanceProductCells();
        }, 100);
      };
    }
    if (tries > 30) clearInterval(timer);
  }, 200);
})();
