import { parseWav, toMono, resampleLinear } from "/src/canonical-pcm.mjs";
import { analyzePcm, chartFromAnalysis } from "/src/sample-analyzer.mjs";
import { verifyChartHashes } from "/src/external-source.ts";
/** New-source creation only. Saved charts are read from the store, never regenerated here. */
export async function generateSourceRecord(bytes, videoId, audioSha256) {
	const actual = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
	if (actual !== audioSha256) throw Error("Source audio integrity failed");
	const parsed = parseWav(bytes), analysis = analyzePcm(resampleLinear(toMono(parsed), parsed.sampleRate, 22050), 22050);
	const charts = {};
	for (const lanes of [5, 7]) for (const difficulty of [
		"low",
		"mid",
		"high"
	]) {
		const notes = chartFromAnalysis(analysis, difficulty, lanes), data = new TextEncoder().encode(JSON.stringify(notes)), sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", data)), (b) => b.toString(16).padStart(2, "0")).join("");
		charts[`${lanes}:${difficulty}`] = {
			notes,
			sha256
		};
	}
	const record = {
		version: 1,
		videoId,
		audioSha256,
		sampleRate: parsed.sampleRate,
		estimatedBpm: analysis.bpm,
		frames: parsed.frames,
		pipelineVersion: "pcm16-stereo44100-48000-linear-v1",
		analyzerVersion: "tuned-2026-11-07",
		config: JSON.stringify({
			mono: "left-to-right-mean",
			analysisSampleRate: 22050,
			hop: 512,
			window: 1024,
			smooth: 7,
			merge: .12,
			grid: "16th±.04s"
		}),
		charts
	};
	if (!await verifyChartHashes(record)) throw Error("Invalid generated chart");
	return record;
}
