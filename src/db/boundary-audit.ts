import "dotenv/config";
import { databasePool } from "./pool";

type OverlapRow = {
	code_a: string;
	name_a: string;
	code_b: string;
	name_b: string;
	overlap_km2: number;
};

type SummaryRow = {
	dataset_code: string;
	version_label: string;
	publisher: string;
	license: string;
	total_boundaries: number;
	invalid_geometries: number;
};

const markdownMode = process.argv.includes("--markdown");
const sql = databasePool();

try {
	const [summary] = await sql<SummaryRow[]>`
    with published as (
      select d.dataset_version_id, d.dataset_code, d.version_label, s.publisher, s.license
      from market_entry.dataset_versions d
      join market_entry.source_registry s on s.source_id = d.source_id
      where d.publication_status = 'published' and s.access_right = 'public' and s.status = 'active'
        and exists (select 1 from market_entry.geo_boundaries b where b.dataset_version_id = d.dataset_version_id)
      order by d.published_at desc, d.dataset_version_id
      limit 1
    )
    select
      p.dataset_code, p.version_label, p.publisher, p.license,
      count(b.geo_id)::int as total_boundaries,
      count(*) filter (where not ST_IsValid(b.geom) or ST_IsEmpty(b.geom) or ST_SRID(b.geom) <> 4326)::int as invalid_geometries
    from published p
    join market_entry.geo_boundaries b on b.dataset_version_id = p.dataset_version_id
    group by p.dataset_code, p.version_label, p.publisher, p.license
  `;

	if (!summary) {
		console.error("No published province boundary dataset found.");
		process.exitCode = 1;
	} else {
		const overlaps = await sql<OverlapRow[]>`
      with published as (
        select d.dataset_version_id
        from market_entry.dataset_versions d
        join market_entry.source_registry s on s.source_id = d.source_id
        where d.publication_status = 'published' and s.access_right = 'public' and s.status = 'active'
          and exists (select 1 from market_entry.geo_boundaries b where b.dataset_version_id = d.dataset_version_id)
        order by d.published_at desc, d.dataset_version_id
        limit 1
      ),
      boundaries as (
        select b.geo_id, g.admin_code, g.display_name, b.geom
        from published p
        join market_entry.geo_boundaries b on b.dataset_version_id = p.dataset_version_id
        join market_entry.geo_units g on g.geo_id = b.geo_id
      )
      select
        a.admin_code as code_a,
        a.display_name as name_a,
        b.admin_code as code_b,
        b.display_name as name_b,
        round((ST_Area(ST_Intersection(a.geom, b.geom)::geography) / 1000000)::numeric, 4)::float as overlap_km2
      from boundaries a
      join boundaries b on a.geo_id < b.geo_id and a.geom && b.geom and ST_Relate(a.geom, b.geom, '2********')
      order by overlap_km2 desc, a.admin_code, b.admin_code
    `;

		const totalOverlapKm2 = Number(
			overlaps.reduce((sum, row) => sum + row.overlap_km2, 0).toFixed(4),
		);

		if (markdownMode) {
			const lines = [
				`# Boundary Overlap Audit (${summary.dataset_code} · ${summary.version_label})`,
				"",
				`- **Publisher:** ${summary.publisher}`,
				`- **License:** ${summary.license}`,
				`- **Total boundaries:** ${summary.total_boundaries}`,
				`- **Invalid geometries:** ${summary.invalid_geometries}`,
				`- **Overlapping province pairs:** ${overlaps.length}`,
				`- **Total overlap area:** ${totalOverlapKm2} km²`,
				"",
				"| # | Province A | Province B | Overlap (km²) |",
				"| --- | --- | --- | ---: |",
				...overlaps.map(
					(row, i) =>
						`| ${i + 1} | ${row.name_a} (${row.code_a}) | ${row.name_b} (${row.code_b}) | ${row.overlap_km2.toFixed(4)} |`,
				),
			];
			console.log(lines.join("\n"));
		} else {
			console.log(
				JSON.stringify({
					dataset: summary,
					overlappingPairs: overlaps.length,
					totalOverlapKm2,
					topOverlaps: overlaps.slice(0, 15),
					overlaps,
				}),
			);
		}
	}
} catch (cause) {
	console.error("Boundary audit failed.", cause);
	process.exitCode = 1;
} finally {
	await sql.end();
}
