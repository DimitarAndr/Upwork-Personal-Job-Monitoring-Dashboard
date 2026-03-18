"use client";

import dynamic from "next/dynamic";

type OverviewChartsShellProps = {
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

const OverviewCharts = dynamic(
  () => import("./overview-charts").then((module) => module.OverviewCharts),
  {
    ssr: false,
    loading: () => (
      <div className="overviewDashboard" aria-hidden="true">
        <article className="overviewChartCard">
          <div className="overviewCardHeader">
            <div>
              <p className="eyebrow">Flow</p>
              <h3>Last 7 days.</h3>
            </div>
          </div>
          <div className="overviewChartEmpty">Loading chart...</div>
        </article>
        <article className="overviewChartCard">
          <div className="overviewCardHeader">
            <div>
              <p className="eyebrow">Quality</p>
              <h3>Decision readiness.</h3>
            </div>
          </div>
          <div className="overviewChartEmpty">Loading chart...</div>
        </article>
        <article className="overviewChartCard">
          <div className="overviewCardHeader">
            <div>
              <p className="eyebrow">Demand</p>
              <h3>Recurring tags.</h3>
            </div>
          </div>
          <div className="overviewChartEmpty">Loading chart...</div>
        </article>
      </div>
    )
  }
);

export function OverviewChartsShell(props: OverviewChartsShellProps) {
  return <OverviewCharts {...props} />;
}
