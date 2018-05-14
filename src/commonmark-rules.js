import { repeat } from './utilities'

var rules = {}

rules.paragraph = {
  filter: 'p',

  replacement: function (content) {
    return '\n\n' + content + '\n\n'
  }
}

rules.lineBreak = {
  filter: 'br',

  replacement: function (content, node, options) {
    return options.br + '\n'
  }
}

rules.heading = {
  filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],

  replacement: function (content, node, options) {
    var hLevel = Number(node.nodeName.charAt(1))

    if (options.headingStyle === 'setext' && hLevel < 3) {
      var underline = repeat((hLevel === 1 ? '=' : '-'), content.length)
      return (
        '\n\n' + content + '\n' + underline + '\n\n'
      )
    } else {
      return '\n\n' + repeat('#', hLevel) + ' ' + content + '\n\n'
    }
  }
}

rules.blockquote = {
  filter: 'blockquote',

  replacement: function (content) {
    content = content.replace(/^\n+|\n+$/g, '')
    content = content.replace(/^/gm, '> ')
    return '\n\n' + content + '\n\n'
  }
}

rules.list = {
  filter: ['ul', 'ol'],

  replacement: function (content, node) {
    var parent = node.parentNode
    if (parent.nodeName === 'LI' && parent.lastElementChild === node) {
      return '\n' + content
    } else {
      return '\n\n' + content + '\n\n'
    }
  }
}

rules.listItem = {
  filter: 'li',

  replacement: function (content, node, options) {
    content = content
      .replace(/^\n+/, '') // remove leading newlines
      .replace(/\n+$/, '\n') // replace trailing newlines with just a single one
      .replace(/\n/gm, '\n    ') // indent
    var prefix = options.bulletListMarker + '   '
    var parent = node.parentNode
    if (parent.nodeName === 'OL') {
      var start = parent.getAttribute('start')
      var index = Array.prototype.indexOf.call(parent.children, node)
      prefix = (start ? Number(start) + index : index + 1) + '.  '
    }
    return (
      prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '')
    )
  }
}

rules.indentedCodeBlock = {
  filter: function (node, options) {
    return (
      options.codeBlockStyle === 'indented' &&
      node.nodeName === 'PRE'
    )
  },

  replacement: function (content, node, options) {
    return (
      '\n\n    ' +
      node.textContent.replace(/\n/g, '\n    ') +
      '\n\n'
    )
  }
}

rules.fencedCodeBlock = {
  filter: function (node, options) {
    return (
      options.codeBlockStyle === 'fenced' &&
      node.nodeName === 'PRE'
    )
  },

  replacement: function (content, node, options) {
    var className = node.firstChild.className || ''
    var language = (className.match(/language-(\S+)/) || [null, ''])[1] || "sh"

    return (
      '\n\n' + options.fence + language + '\n' +
      node.textContent +
      '\n' + options.fence + '\n\n'
    )
  }
}

rules.horizontalRule = {
  filter: 'hr',

  replacement: function (content, node, options) {
    return '\n\n' + options.hr + '\n\n'
  }
}

rules.htmlLink = {
  filter: function(node, options) {
   return (
      options.linkStyle === 'html' &&
      node.nodeName === 'A' &&
      node.getAttribute('href')
    )
  },

  replacement: function(content, node) {
    var href = node.getAttribute('href');
    var title = node.title;
    return '<a href="'+ href +'" title="'+ title +'" rel="nofollow" target="_blank">'+content+'</a>'
  }
}


rules.inlineLink = {
  filter: function (node, options) {
    return (
      options.linkStyle === 'inlined' &&
      node.nodeName === 'A' &&
      node.getAttribute('href')
    )
  },

  replacement: function (content, node) {
    var href = node.getAttribute('href')
    var title = node.title ? ' "' + node.title + '"' : ''
    return '[' + content + '](' + href + title + ')'
  }
}

rules.referenceLink = {
  filter: function (node, options) {
    return (
      options.linkStyle === 'referenced' &&
      node.nodeName === 'A' &&
      node.getAttribute('href')
    )
  },

  replacement: function (content, node, options) {
    var href = node.getAttribute('href')
    var title = node.title ? ' "' + node.title + '"' : ''
    var replacement
    var reference

    switch (options.linkReferenceStyle) {
      case 'collapsed':
        replacement = '[' + content + '][]'
        reference = '[' + content + ']: ' + href + title
        break
      case 'shortcut':
        replacement = '[' + content + ']'
        reference = '[' + content + ']: ' + href + title
        break
      default:
        var id = this.references.length + 1
        replacement = '[' + content + '][' + id + ']'
        reference = '[' + id + ']: ' + href + title
    }

    this.references.push(reference)
    return replacement
  },

  references: [],

  append: function (options) {
    var references = ''
    if (this.references.length) {
      references = '\n\n' + this.references.join('\n') + '\n\n'
      this.references = [] // Reset references
    }
    return references
  }
}

rules.emphasis = {
  filter: ['em', 'i'],

  replacement: function (content, node, options) {
    if (!content.trim()) return ''
    return options.emDelimiter + content + options.emDelimiter
  }
}

rules.strong = {
  filter: ['strong', 'b'],

  replacement: function (content, node, options) {
    if (!content.trim()) return ''
    return options.strongDelimiter + content + options.strongDelimiter
  }
}

rules.code = {
  filter: function (node) {
    var hasSiblings = node.previousSibling || node.nextSibling
    var isCodeBlock = node.parentNode.nodeName === 'PRE' && !hasSiblings

    return node.nodeName === 'CODE' && !isCodeBlock
  },

  replacement: function (content) {
    if (!content.trim()) return ''

    var delimiter = '`'
    var leadingSpace = ''
    var trailingSpace = ''
    var matches = content.match(/`+/gm)
    if (matches) {
      if (/^`/.test(content)) leadingSpace = ' '
      if (/`$/.test(content)) trailingSpace = ' '
      while (matches.indexOf(delimiter) !== -1) delimiter = delimiter + '`'
    }

    return delimiter + leadingSpace + content + trailingSpace + delimiter
  }
}

rules.image = {
  filter: 'img',

  replacement: function (content, node) {
    var alt = node.alt || ''
    var src = node.getAttribute('src') || ''
    var title = node.title || ''
    var titlePart = title ? ' "' + title + '"' : ''
    return src ? '![' + alt + ']' + '(' + src + titlePart + ')' : ''
  }
}

rules.table = {
  filter:'table',

  replacement: function(content, node, options) {
    var table = '',
      thead = '|',
      tbody = '', 
      divider = '|';
    var th = node.getElementsByTagName('th');
    var tr = node.getElementsByTagName('tr'); 
    if(!th.length){
      return node.outerHTML
    }
    for(var i = 0; i< th.length; i++) {
      thead = thead + th[i].innerHTML+'|';
      divider = divider + options.tableAlign + '|';
    }
    for(var j = 1; j< tr.length; j++ ) {
      var td = tr[j].getElementsByTagName('td');
      var cur_tr = '|';
      for(var k = 0; k< td.length; k++){
        cur_tr = cur_tr + td[k].innerHTML + '|';
      }
      tbody = tbody + cur_tr + '\n';
    }
    table = '\n'+thead+'\n'+divider+ '\n'+tbody;
    return table;
  }
}

export default rules
