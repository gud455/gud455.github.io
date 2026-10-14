"""Validate generated pages, internal links, redirects and record search metadata."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote
import json
import sys
import xml.etree.ElementTree as ET

root = Path(sys.argv[1] if len(sys.argv) > 1 else '_site').resolve()
errors = []

class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.ids, self.refs, self.h1, self.records = set(), [], 0, []
        self.main = self.lang = self.viewport = self.title = False
        self.feed(source)

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            if attrs['id'] in self.ids:
                errors.append(f'Duplicate ID: {attrs["id"]}')
            self.ids.add(attrs['id'])
        for key in ('href', 'src'):
            if attrs.get(key):
                self.refs.append(attrs[key])
        self.h1 += tag == 'h1'
        self.main |= tag == 'main'
        self.lang |= tag == 'html' and attrs.get('lang') == 'zh-CN'
        self.viewport |= tag == 'meta' and attrs.get('name') == 'viewport'
        self.title |= tag == 'title'
        if 'data-record' in attrs:
            self.records.append(attrs)

required = ['index.html', 'research/index.html', 'papers/index.html',
            'projects/index.html', 'notes/index.html', '404.html',
            'ai/index.html', 'others/about/index.html', 'assets/search.html',
            'modeling/index.html', 'modeling/evaluation/topsis/index.html',
            'programming/python/python-basics/index.html',
            'records/ddpm/index.html', 'assets/academic/site.css',
            'assets/academic/site.js', 'feed.xml']
for name in required:
    if not (root / name).is_file():
        errors.append(f'Missing output: {name}')

pages = {}
for path in root.rglob('*.html'):
    source = path.read_text(encoding='utf-8')
    page = Page(source)
    pages[path] = page
    if not page.lang or not page.viewport or not page.title:
        errors.append(f'Missing page metadata: {path.relative_to(root)}')
    if page.main and page.h1 != 1:
        errors.append(f'Expected one H1: {path.relative_to(root)} ({page.h1})')
    # Jekyll deliberately copies historic JavaScript/CSS. Active pages must use the new shell.
    if page.main and ('gitbook.js' in source or 'theme.js' in source):
        errors.append(f'Old runtime loaded: {path.relative_to(root)}')
    for record in page.records:
        if not record.get('data-search') or not record.get('data-tags'):
            errors.append(f'Missing record filter data: {path.relative_to(root)}')

for path, page in pages.items():
    source_url = '/' + path.relative_to(root).as_posix()
    for ref in page.refs:
        target = urlsplit(urljoin(source_url, ref))
        if target.scheme or target.netloc or target.path.startswith('//'):
            continue
        dest = root / unquote(target.path).lstrip('/')
        if dest.is_dir() or target.path.endswith('/'):
            dest /= 'index.html'
        if not dest.exists():
            errors.append(f'Broken link: {path.relative_to(root)} -> {ref}')
        elif target.fragment and dest in pages and unquote(target.fragment) not in pages[dest].ids:
            errors.append(f'Missing anchor: {path.relative_to(root)} -> {ref}')

expected = {'research/index.html': 2, 'papers/index.html': 2,
            'projects/index.html': 4, 'notes/index.html': 11}
for name, count in expected.items():
    page = pages.get(root / name)
    if page and len(page.records) != count:
        errors.append(f'Wrong record count for {name}: {len(page.records)} instead of {count}')
if (root / 'assets/search_plus_index.json').exists():
    index = json.loads((root / 'assets/search_plus_index.json').read_text(encoding='utf-8'))
    if len(index) != 11:
        errors.append(f'Wrong search index count: {len(index)}')
if (root / 'feed.xml').exists():
    feed = ET.parse(root / 'feed.xml')
    if len(feed.findall('{http://www.w3.org/2005/Atom}entry')) != 11:
        errors.append('Research feed must contain all 11 records')
if errors:
    print('\n'.join(errors))
    raise SystemExit(1)
print(f'Validated {len(pages)} HTML pages, internal links, redirects and 11 learning records.')
