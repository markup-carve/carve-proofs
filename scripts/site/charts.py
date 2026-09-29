"""Export historical observations with units and source metadata."""
import csv
import json
from pathlib import Path
from statistics import median
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / '_site' / 'charts'
OUT.mkdir(parents=True, exist_ok=True)
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10, 'svg.fonttype': 'none'})
COLORS = ['#126c68', '#c95730', '#6154a4', '#ad7d19']
charts = []

def export(dataset, family, phase, metric, unit, series, metadata, note):
    slug = '-'.join([dataset, family, phase, metric])
    load = metadata.get('loadStart', metadata.get('loadAverage'))
    if load:
        note += f" Recorded host load: {load}; logical CPUs: {metadata.get('logicalCpus', 'not recorded')}."
    depth = 'nested' in family or dataset in ['profile', 'profile-js', 'prefix-change', 'tail-change']
    cached_points = [dict(reader=reader, **r) for reader, rows in series.items() for r in rows]
    record = dict(id=slug, dataset=dataset, family=family, phase=phase, metric=metric, unit=unit, xUnit='depth' if depth else 'bytes', points=cached_points, metadata=metadata, note=note)
    cached = OUT / f'{slug}.json'
    if cached.exists() and {k: v for k, v in json.loads(cached.read_text()).items() if k != 'note'} == {k: v for k, v in record.items() if k != 'note'} and all((OUT / f'{slug}.{ext}').exists() for ext in ['svg', 'png', 'csv']):
        cached.write_text(json.dumps(record))
        charts.append(record)
        return
    fig, ax = plt.subplots(figsize=(8.4, 5.2), layout='constrained')
    points = []
    for index, (reader, rows) in enumerate(series.items()):
        valid = [r for r in rows if r['value'] is not None]
        if valid:
            ax.plot([r['x'] for r in valid], [r['value'] for r in valid], 'o-', label=reader, color=COLORS[index % len(COLORS)], linewidth=1.8, markersize=4)
            ax.fill_between([r['x'] for r in valid], [r['low'] for r in valid], [r['high'] for r in valid], color=COLORS[index % len(COLORS)], alpha=.10)
        points.extend(dict(reader=reader, **r) for r in rows)
    depth = 'nested' in family or dataset in ['profile', 'profile-js', 'prefix-change', 'tail-change']
    ax.set(xlabel='Nesting depth' if depth else 'Input bytes', ylabel=unit, title=f'{family} · {phase} · {metric}')
    ax.set_ylim(bottom=0)
    ax.grid(alpha=.18)
    ax.spines[['top', 'right']].set_visible(False)
    if ax.lines:
        ax.legend(frameon=False)
    date = metadata.get('generatedAt', 'date not recorded')
    fig.supxlabel(f'{dataset} | {date}\nHistorical observations; see accompanying JSON for pins and method.', fontsize=8)
    for extension in ['svg', 'png']:
        fig.savefig(OUT / f'{slug}.{extension}', dpi=160)
    plt.close(fig)
    with (OUT / f'{slug}.csv').open('w') as file:
        writer = csv.DictWriter(file, fieldnames=['reader', 'x', 'value', 'low', 'high', 'status'])
        writer.writeheader()
        writer.writerows(points)
    record = dict(id=slug, dataset=dataset, family=family, phase=phase, metric=metric, unit=unit, xUnit='depth' if depth else 'bytes', points=points, metadata=metadata, note=note)
    (OUT / f'{slug}.json').write_text(json.dumps(record))
    charts.append(record)

def observation(row, samples, depth):
    valid = row.get('status', 'ok') == 'ok' and bool(samples)
    return dict(x=row['size'] if depth else row['bytes'], value=median(samples) if valid else None, low=min(samples) if valid else None, high=max(samples) if valid else None, status=row.get('status', 'ok'))

for dataset, file in [('javascript', 'comparison-timings'), ('native', 'djot-v-timings'), ('scaling', 'scaling-results'), ('confirmation', 'scaling-confirmation')]:
    data = json.loads((ROOT / 'reports' / f'{file}.json').read_text())
    groups = data['groups']
    metrics = [('wall', 'Milliseconds / operation'), ('cpu', 'CPU milliseconds / operation')]
    if dataset == 'native':
        metrics.append(('allocation', 'Allocated bytes / operation'))
    if dataset in ['scaling', 'confirmation']:
        metrics = metrics[:1]
    for family in sorted({g['family'] for g in groups}):
        for phase in sorted({g.get('mode', g.get('phase')) for g in groups}):
            for metric, unit in metrics:
                series = {}
                for group in groups:
                    if group['family'] != family or group.get('mode', group.get('phase')) != phase:
                        continue
                    rows = []
                    for row in group['rows']:
                        if dataset == 'native':
                            key = dict(wall='wallMs', cpu='cpuMs', allocation='allocatedBytes')[metric]
                            samples = [s[key] for s in row.get('samples', [])]
                        else:
                            samples = row.get('samplesMs' if metric == 'wall' else 'samplesCpuMs', [])
                        rows.append(observation(row, samples, 'nested' in family))
                    series[group.get('reader', 'djot.v / OCaml')] = rows
                if series:
                    note = 'Median and observed sample range, not a confidence interval. Phases are independent runs. API features differ; these curves are not a language ranking.'
                    if dataset == 'native':
                        note += ' This native run had high host load and is kept separate from JavaScript runs.'
                    if dataset in ['scaling', 'confirmation']:
                        note += ' The specification parse API builds blocks only. Missing or refused observations remain in the data table.'
                    export(dataset, family, phase, metric, unit, series, data['metadata'], note)

data = json.loads((ROOT / 'reports' / 'nesting-profile.json').read_text())
for family in sorted({g['family'] for g in data['groups']}):
    for phase in ['parse', 'render']:
        for metric, unit in [('regex-calls', 'Instrumented regular expression calls'), ('regex-input', 'Regex input exposure (UTF-16 units)'), ('regex-matched', 'Successful regex match lengths (UTF-16 units)'), ('regex-advance', 'Global regex forward progress (UTF-16 units)'), ('suffix-input', 'Suffix argument lengths (UTF-16 units)'), ('layout', 'Instrumented layout operations'), ('sampled-allocation', 'Sampled allocation bytes / operation')]:
            series = {}
            for group in data['groups']:
                if group['family'] != family or group['phase'] != phase:
                    continue
                assert all('y' not in p['pattern'].rsplit('/', 1)[-1] for p in group['patterns']), 'Review sticky regex instrumentation'
                if metric == 'regex-calls':
                    value = sum(p['calls'] for p in group['patterns'])
                elif metric == 'regex-input':
                    value = sum(p['inputChars'] for p in group['patterns'])
                elif metric == 'regex-matched':
                    value = sum(p['matchedChars'] for p in group['patterns'])
                elif metric == 'regex-advance':
                    value = sum(p['globalAdvance'] for p in group['patterns'])
                elif metric == 'suffix-input':
                    value = group['suffixes']['suffixChars']
                elif metric == 'layout':
                    value = group['layout'].get('total', sum(group['layout'].values()))
                else:
                    value = group['sampledAllocationBytes'] / group['heapIterations']
                series.setdefault(group['reader'], []).append(dict(x=group['size'], value=value, low=value, high=value, status='ok'))
            if series:
                export('profile', family, phase, metric, unit, series, data['metadata'], 'Instrumentation covers selected operations. Input exposure, successful match lengths, global progress and suffix argument lengths do not count engine steps. Heap sampling estimates allocation churn, not retained memory. Reader counters have different scopes. These measurements do not prove asymptotic complexity.')
                export('profile-js', family, phase, metric, unit, {'js': series['js']}, data['metadata'], 'JavaScript reader only. Input exposure, successful match lengths, global progress and suffix argument lengths do not count engine steps. Failed non-global scans and non-regex operations are outside the match-length counter. These measurements do not prove asymptotic complexity.')
for dataset, history in [('prefix-change', 'pre-prefix-refresh'), ('tail-change', 'pre-tail-refresh')]:
    before = json.loads((ROOT / 'reports/history' / history / 'nesting-profile.json').read_text())
    after = json.loads((ROOT / 'reports/nesting-profile.json').read_text())
    for family in ['quotes', 'lists']:
        for metric, unit in [('regex-calls', 'Instrumented regular expression calls'), ('regex-input', 'Regex input exposure (UTF-16 units)'), ('sampled-allocation', 'Sampled allocation bytes / operation')]:
            series = {}
            for label, report in [('before', before), ('after', after)]:
                pin = report['metadata']['engine'].split('#')[-1][:10]
                rows = []
                for group in report['groups']:
                    if group['reader'] != 'js' or group['phase'] != 'parse' or group['family'] != family:
                        continue
                    if metric == 'regex-calls':
                        samples = [sum(p['calls'] for p in group['patterns'])]
                    elif metric == 'regex-input':
                        samples = [sum(p['inputChars'] for p in group['patterns'])]
                    elif metric == 'sampled-allocation':
                        samples = [group['sampledAllocationBytes'] / group['heapIterations']]
                    else:
                        samples = [s['wallMs'] for s in group['samples']]
                    rows.append(observation(group, samples, True))
                series[f'{label} / {pin}'] = rows
            metadata = dict(generatedAt=after['metadata']['generatedAt'], before=before['metadata'], after=after['metadata'])
            export(dataset, family, 'parse', metric, unit, series, metadata, 'Different pinned reader revisions and historical runs. Regex calls use the same instrumentation; timing and allocation are affected by host load and sampling. These observations do not isolate a single commit or prove a complexity bound.')
(OUT / 'index.json').write_text(json.dumps(charts))
print(f'Exported {len(charts)} charts as SVG, PNG, CSV and JSON')
