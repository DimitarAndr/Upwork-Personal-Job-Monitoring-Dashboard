"use client";

import { ResponsiveBar } from "@nivo/bar";
import { ResponsiveLine } from "@nivo/line";
import { ResponsiveTreeMap } from "@nivo/treemap";

type OverviewChartsProps = {
  qualityBands: Array<{
    count: number;
    label: string;
  }>;
  recentVolume: Array<{
    count: number;
    isoDate: string;
    label: string;
  }>;
  topTags: Array<{
    count: number;
    label: string;
  }>;
};

const qualityColors: Record<string, string> = {
  Strong: "#6a765f",
  Good: "#85917b",
  Workable: "#b39c7d",
  Thin: "#cdbfad"
};

const tagPalette = ["#6a765f", "#8a9380", "#9f8d73", "#b3a082", "#7a8375", "#c3b49e"];

const chartTheme = {
  axis: {
    domain: {
      line: {
        stroke: "rgba(90, 102, 88, 0.14)",
        strokeWidth: 1
      }
    },
    legend: {
      text: {
        fill: "#68685e",
        fontSize: 11
      }
    },
    ticks: {
      line: {
        stroke: "rgba(90, 102, 88, 0.1)",
        strokeWidth: 1
      },
      text: {
        fill: "#68685e",
        fontSize: 11
      }
    }
  },
  crosshair: {
    line: {
      stroke: "rgba(90, 102, 88, 0.2)",
      strokeDasharray: "4 6",
      strokeWidth: 1
    }
  },
  grid: {
    line: {
      stroke: "rgba(90, 102, 88, 0.1)",
      strokeDasharray: "4 6",
      strokeWidth: 1
    }
  },
  tooltip: {
    container: {
      background: "rgba(252, 248, 241, 0.98)",
      border: "1px solid rgba(90, 102, 88, 0.12)",
      borderRadius: "16px",
      boxShadow: "0 18px 34px rgba(31, 36, 30, 0.08)",
      color: "#313b31",
      fontSize: "12px",
      padding: "10px 12px"
    }
  }
};

function ChartEmpty({ children }: { children: React.ReactNode }) {
  return <div className="overviewChartEmpty">{children}</div>;
}

function getDemandLabel(node: {
  id: string | number;
  width: number;
  height: number;
}) {
  const label = String(node.id);
  const longestSide = Math.max(node.width, node.height);
  const shortestSide = Math.min(node.width, node.height);

  // Hide labels when the tile is too cramped to stay readable.
  if (shortestSide < 22 || longestSide < 54) {
    return "";
  }

  const maxChars = Math.floor((longestSide - 12) / 7);
  if (maxChars <= 3) {
    return "";
  }

  return label.length > maxChars
    ? `${label.slice(0, Math.max(maxChars - 1, 3))}…`
    : label;
}

export function OverviewCharts({
  qualityBands,
  recentVolume,
  topTags
}: OverviewChartsProps) {
  const flowSeries = [
    {
      id: "Leads",
      data: recentVolume.map((entry) => ({
        x: entry.label,
        y: entry.count
      }))
    }
  ];

  const qualityData = qualityBands.map((entry) => ({
    label: entry.label,
    leads: entry.count
  }));

  const tagData = topTags.map((entry) => ({
    count: entry.count,
    label: entry.label
  }));

  const demandTree = {
    children: topTags.map((entry) => ({
      id: entry.label,
      value: entry.count
    })),
    id: "Demand"
  };

  const topTag = topTags[0]?.label ?? null;

  return (
    <div className="overviewDashboard">
      <article className="overviewChartCard">
        <div className="overviewCardHeader">
          <div>
            <p className="eyebrow">Flow</p>
            <h3>Last 7 days.</h3>
          </div>
          <p className="microCopy">By posted date.</p>
        </div>

        {recentVolume.length > 0 ? (
          <div className="overviewChartCanvas" aria-label="Recent lead volume">
            <ResponsiveLine
              animate
              axisBottom={{ tickPadding: 10, tickSize: 0 }}
              axisLeft={{ tickPadding: 10, tickSize: 0 }}
              colors={["#6a765f"]}
              curve="monotoneX"
              data={flowSeries}
              enableArea
              enableGridX={false}
              lineWidth={2}
              margin={{ bottom: 38, left: 34, right: 14, top: 18 }}
              pointBorderColor="#6a765f"
              pointBorderWidth={2}
              pointColor="#fdf9f2"
              pointSize={8}
              theme={chartTheme}
              useMesh
              yScale={{
                max: "auto",
                min: 0,
                stacked: false,
                type: "linear"
              }}
            />
          </div>
        ) : (
          <ChartEmpty>No lead volume yet.</ChartEmpty>
        )}
      </article>

      <article className="overviewChartCard">
        <div className="overviewCardHeader">
          <div>
            <p className="eyebrow">Quality</p>
            <h3>Decision readiness.</h3>
          </div>
          <p className="microCopy">Rule-based score.</p>
        </div>

        {qualityData.length > 0 ? (
          <div className="overviewChartCanvas overviewChartCanvasCompact" aria-label="Lead quality distribution">
            <ResponsiveBar
              animate
              axisBottom={{ tickPadding: 10, tickSize: 0 }}
              axisLeft={{ tickPadding: 8, tickSize: 0 }}
              borderRadius={10}
              colors={({ indexValue }) => qualityColors[String(indexValue)] ?? "#6a765f"}
              data={qualityData}
              enableGridX={false}
              enableLabel={false}
              indexBy="label"
              keys={["leads"]}
              margin={{ bottom: 36, left: 36, right: 10, top: 18 }}
              padding={0.42}
              theme={chartTheme}
              tooltipLabel={(datum) => String(datum.indexValue)}
              valueScale={{ type: "linear" }}
            />
          </div>
        ) : (
          <ChartEmpty>No quality bands yet.</ChartEmpty>
        )}
      </article>

      <article className="overviewChartCard">
        <div className="overviewCardHeader">
          <div>
            <p className="eyebrow">Demand</p>
            <h3>Recurring tags.</h3>
          </div>
          <p className="microCopy">{topTag ? `Top signal: ${topTag}.` : "No recurring tags yet."}</p>
        </div>

        {tagData.length > 0 ? (
          <div className="overviewChartCanvas overviewChartCanvasCompact" aria-label="Top recurring tags">
            <ResponsiveTreeMap
              animate
              borderColor="rgba(250, 246, 239, 0.82)"
              borderWidth={2}
              colors={(node) => {
                const index = topTags.findIndex((entry) => entry.label === String(node.id));
                return tagPalette[index % tagPalette.length] ?? "#8a9380";
              }}
              data={demandTree}
              enableParentLabel={false}
              innerPadding={6}
              label={getDemandLabel}
              labelSkipSize={24}
              labelTextColor="#2f372d"
              leavesOnly
              margin={{ bottom: 4, left: 4, right: 4, top: 4 }}
              nodeOpacity={1}
              theme={chartTheme}
              tile="squarify"
              value="value"
              valueFormat={(value) => `${value} leads`}
            />
          </div>
        ) : (
          <ChartEmpty>No recurring tags yet.</ChartEmpty>
        )}
      </article>
    </div>
  );
}
