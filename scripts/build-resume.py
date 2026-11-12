#!/usr/bin/env python3
"""Build the public generic CV from maintained resume data and the project catalog.

Requires reportlab and pypdf. Run from any directory:
  python3 scripts/build-resume.py
  python3 scripts/build-resume.py --check
The public PDF is limited to two A4 pages; job-specific CVs belong outside the site.
"""
from __future__ import annotations

import argparse
from html import escape
from io import BytesIO
import json
from pathlib import Path
import subprocess
import sys
import unicodedata

from pypdf import PdfReader
from reportlab import rl_config
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import HRFlowable, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parent.parent
DESTINATION = ROOT / 'assets/docs/matteo-giorgetti-resume-current.pdf'
INK = colors.HexColor('#18242e')
MUTED = colors.HexColor('#465763')
ACCENT = colors.HexColor('#24566e')
LINE = colors.HexColor('#cbd5db')
rl_config.invariant = 1
rl_config.useA85 = 0


def clean(value: str) -> str:
    """Keep punctuation predictable for extraction and standard PDF fonts."""
    return unicodedata.normalize('NFC', str(value)).translate(str.maketrans({'–': '-', '—': '-', '‑': '-', '’': "'", '“': '"', '”': '"'}))


def text(value: str) -> str:
    return escape(clean(value), quote=True)


def link(label: str, url: str) -> str:
    return f'<link href="{escape(url, quote=True)}" color="#24566e">{text(label)}</link>'


def read_sources():
    data = json.loads((ROOT / 'data/resume.json').read_text())
    result = subprocess.run(
        ['node', '--input-type=module', '-e', "import { projects } from './js/playfolio/project-catalog.js'; process.stdout.write(JSON.stringify(projects));"],
        cwd=ROOT, capture_output=True, text=True, check=True,
    )
    by_id = {project['id']: project for project in json.loads(result.stdout)}
    selected = [by_id[project_id] for project_id in data['cvProjectIds']]
    selected.sort(key=lambda project: project['priority'])
    for project in selected:
        if not data['cvProjectBullets'].get(project['id']):
            raise ValueError(f"Missing CV content for {project['id']}")
    return data, selected


def styles():
    base = getSampleStyleSheet()
    definitions = {
        'Name': dict(fontName='Helvetica-Bold', fontSize=25, leading=28, textColor=INK, spaceAfter=5),
        'Headline': dict(fontName='Helvetica', fontSize=10.3, leading=14, textColor=MUTED, spaceAfter=6),
        'Contact': dict(fontName='Helvetica', fontSize=9.5, leading=13, textColor=MUTED, spaceAfter=3),
        'Section': dict(fontName='Helvetica-Bold', fontSize=11.5, leading=14, textColor=ACCENT, spaceBefore=14, spaceAfter=7, keepWithNext=True),
        'Title': dict(fontName='Helvetica-Bold', fontSize=10.7, leading=13.6, textColor=INK, spaceAfter=2, keepWithNext=True),
        'Meta': dict(fontName='Helvetica', fontSize=9.5, leading=12.5, textColor=MUTED, spaceAfter=4, keepWithNext=True),
        'Body': dict(fontName='Helvetica', fontSize=10.1, leading=13.7, textColor=INK, spaceAfter=4),
        'Bullet': dict(fontName='Helvetica', fontSize=10.1, leading=13.7, textColor=INK, leftIndent=10, firstLineIndent=-8, spaceAfter=4),
        'Small': dict(fontName='Helvetica', fontSize=9.5, leading=12.7, textColor=MUTED, spaceAfter=5),
        'Date': dict(fontName='Helvetica', fontSize=9.5, leading=13.6, textColor=MUTED, alignment=TA_RIGHT),
    }
    for name, definition in definitions.items():
        base.add(ParagraphStyle(name=f'CV{name}', **definition))
    return base


def build_pdf(data, selected):
    style = styles()
    content = []
    identity = data['identity']
    width = A4[0] - 100
    para = lambda value, kind='Body': Paragraph(value, style[f'CV{kind}'])

    def heading(label):
        content.extend([para(text(label.upper()), 'Section'), HRFlowable(width='100%', thickness=0.55, color=LINE), Spacer(1, 6)])

    def title_date(title, date):
        row = Table([[para(title, 'Title'), para(text(date), 'Date')]], colWidths=[width * .7, width * .3], hAlign='LEFT')
        row.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0), ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0)]))
        return row

    def block(entry, include_location=True, include_bullets=True):
        parts = [title_date(text(entry['title']), entry['dates'])]
        meta = entry['organization']
        if include_location and entry.get('location'):
            meta += ' | ' + entry['location']
        if entry.get('badge'):
            meta += ' | ' + entry['badge']
        parts.append(para(text(meta), 'Meta'))
        if include_bullets:
            parts.extend(para('- ' + text(bullet), 'Bullet') for bullet in entry.get('bullets', []))
        parts.append(Spacer(1, 5))
        content.append(KeepTogether(parts))

    def project_block(project):
        url = identity['website'] + project['href']
        parts = [title_date(link(project['label'], url), project['dates']), para(text(project['stack']), 'Meta')]
        parts.extend(para('- ' + text(bullet), 'Bullet') for bullet in data['cvProjectBullets'][project['id']])
        parts.append(Spacer(1, 6))
        content.append(KeepTogether(parts))

    content.append(para(text(identity['name']), 'Name'))
    content.append(para('Computer Science &amp; Artificial Intelligence | Software Engineering', 'Headline'))
    content.append(para(text(identity['location']) + ' | ' + link(identity['email'], 'mailto:' + identity['email']), 'Contact'))
    content.append(para(text(identity['phone']) + ' | ' + link('mgiorgetti.com', identity['website']) + ' | ' + link('GitHub: Inventure71', identity['github']) + ' | ' + link('LinkedIn', identity['linkedin']), 'Contact'))
    content.append(Spacer(1, 8))
    content.append(para(text(identity['summary'])))

    heading('Education')
    for entry in data['education']:
        block(entry, include_bullets=False)
    heading('Experience')
    for entry in data['experience']:
        block(entry)

    heading('Selected engineering projects')
    # A deliberate page boundary keeps each project intact and gives both pages
    # readable body text rather than shrinking type to fit every project.
    for project in selected[:2]:
        project_block(project)
    content.append(PageBreak())
    heading('Selected engineering projects / continued')
    for project in selected[2:]:
        project_block(project)

    heading('Community & leadership')
    for entry_id in ['codex-ambassador', 'gdg-leadership', 'bot-battle', 'tech-roulette-judge']:
        entry = next(entry for entry in data['community'] if entry['id'] == entry_id)
        # Keep the full event contribution, while club/membership entries use a
        # compact line so they do not crowd out technical evidence.
        if entry_id in ['bot-battle', 'tech-roulette-judge']:
            parts = [title_date(link(entry['title'], entry['href']), entry['dates'])]
            parts.extend(para(text(bullet)) for bullet in entry['bullets'])
            parts.append(Spacer(1, 4))
            content.append(KeepTogether(parts))
        else:
            content.append(KeepTogether([title_date(text(entry['title']), entry['dates']), para(text(entry['bullets'][0])), Spacer(1, 4)]))

    heading('Technical skills')
    for skill_id in ['programming', 'native', 'backend', 'ml', 'robotics']:
        skill = next(skill for skill in data['skills'] if skill['id'] == skill_id)
        content.append(para(f"<b>{text(skill['title'])}:</b> {text(', '.join(skill['items']))}.", 'Small'))

    content.append(Spacer(1, 5))
    courses = [f"{entry['organization']}: {entry['title']} ({entry['dates']})" for entry in data['certifications']]
    content.append(para('<b>Courses:</b> ' + text('; '.join(courses)) + '.', 'Small'))
    languages = next(skill for skill in data['skills'] if skill['id'] == 'languages')
    content.append(para('<b>Languages:</b> ' + text('; '.join(languages['items'])) + '.', 'Small'))

    output = BytesIO()
    doc = SimpleDocTemplate(output, pagesize=A4, rightMargin=44, leftMargin=44, topMargin=37, bottomMargin=38, title=f"{identity['name']} - Curriculum Vitae", author=identity['name'], subject='Generic internship CV', invariant=1)

    def footer(canvas, _doc):
        canvas.saveState()
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.4)
        canvas.line(44, 30, A4[0] - 44, 30)
        canvas.setFont('Helvetica', 8.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(44, 18, identity['name'] + ' | mgiorgetti.com')
        canvas.drawRightString(A4[0] - 44, 18, f'{_doc.page}')
        canvas.restoreState()

    doc.build(content, onFirstPage=footer, onLaterPages=footer, canvasmaker=Canvas)
    result = output.getvalue()
    page_count = len(PdfReader(BytesIO(result)).pages)
    if not 1 <= page_count <= 2:
        raise ValueError(f'CV must have at most two pages; generated {page_count}. Adjust content, not minimum font size.')
    return result, page_count


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Check that the maintained PDF matches its sources.')
    args = parser.parse_args()
    data, selected = read_sources()
    result, count = build_pdf(data, selected)
    if args.check:
        if not DESTINATION.exists() or DESTINATION.read_bytes() != result:
            print('CV PDF is out of sync. Run python3 scripts/build-resume.py.', file=sys.stderr)
            return 1
        print(f'CV PDF is in sync ({count} pages).')
    else:
        DESTINATION.parent.mkdir(parents=True, exist_ok=True)
        DESTINATION.write_bytes(result)
        print(f'Built {DESTINATION.relative_to(ROOT)} ({count} pages).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
