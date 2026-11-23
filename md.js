/* A small, safe Markdown reader for blog posts.
   Everything is escaped first, so a post can never inject code. Links must be http(s), images must be https.
   Supports: # headings, **bold**, *italic*, `code`, ``` code blocks ```, [links](https://…), ![images](https://…),
   - lists, 1. lists, > quotes, --- lines, and paragraphs. */
(function () {
  var esc = function (t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var inline = function (t) {   // t is already escaped
    return t
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" loading="lazy">')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  };
  window.renderMarkdown = function (src) {
    var lines = String(src || '').replace(/\r/g, '').split('\n'), out = [], para = [], list = null, i, line, m;
    var flush = function () {
      if (para.length) { out.push('<p>' + inline(esc(para.join(' '))) + '</p>'); para = []; }
      if (list) { out.push('<' + list.type + '>' + list.items.map(function (x) { return '<li>' + inline(esc(x)) + '</li>'; }).join('') + '</' + list.type + '>'); list = null; }
    };
    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      if (/^```/.test(line)) {                       // code block
        flush(); var code = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) { code.push(lines[i]); i++; }
        out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); continue;
      }
      if (!line.trim()) { flush(); continue; }
      if ((m = line.match(/^(#{1,3})\s+(.*)$/))) { flush(); var n = m[1].length + 1; out.push('<h' + n + '>' + inline(esc(m[2])) + '</h' + n + '>'); continue; }
      if (/^(-{3,}|\*{3,})\s*$/.test(line)) { flush(); out.push('<hr>'); continue; }
      if ((m = line.match(/^>\s?(.*)$/))) { flush(); out.push('<blockquote>' + inline(esc(m[1])) + '</blockquote>'); continue; }
      if ((m = line.match(/^\s*[-*]\s+(.*)$/)) || (m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
        var type = /^\s*\d/.test(line) ? 'ol' : 'ul';
        if (para.length) flush();
        if (list && list.type !== type) flush();
        if (!list) list = { type: type, items: [] };
        list.items.push(m[1]); continue;
      }
      if (list) flush();
      para.push(line.trim());
    }
    flush();
    return out.join('\n');
  };
})();
