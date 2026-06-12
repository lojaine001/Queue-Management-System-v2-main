import { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  RefreshControl, StatusBar, ActivityIndicator, SafeAreaView, Dimensions, Image,
} from 'react-native';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryArea, VictoryTheme, VictoryPie, VictoryBar } from 'victory-native';

// ── Config ────────────────────────────────────────────────────────────────────
const API_URL = 'https://cheese-annuity-sulk.ngrok-free.dev';
const REFRESH_MS = 15000;
const H = { 'ngrok-skip-browser-warning': '1' };

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:       '#0d1117',
  surface:  '#161b22',
  surface2: '#1c2128',
  border:   '#30363d',
  text:     '#e6edf3',
  textSub:  '#8b949e',
  textDim:  '#484f58',
  accent:   '#f97316',
  green:    '#3fb950',
  yellow:   '#d29922',
  orange:   '#db6d28',
  red:      '#f85149',
  blue:     '#58a6ff',
  purple:   '#a371f7',
  cyan:     '#39d353',
};

const LANE_STATUS = {
  closed:    { color: C.textDim,  label: 'CLOSED', bg: '#21262d' },
  open:      { color: C.green,    label: 'OPEN',   bg: '#1a2e22' },
  busy:      { color: C.yellow,   label: 'BUSY',   bg: '#2d2a1a' },
  busy_high: { color: C.red,      label: 'BUSY',   bg: '#2d1a1a' },
};

const ALERT_STYLE = {
  red:    { bg: '#2d1a1a', border: C.red,    label: 'CRITICAL', color: C.red    },
  orange: { bg: '#2d2218', border: C.orange, label: 'URGENT',   color: C.orange },
  yellow: { bg: '#2d2a1a', border: C.yellow, label: 'WARNING',  color: C.yellow },
};

const SCENARIO_COLOR = { red: C.red, orange: C.orange, yellow: C.yellow, green: C.green };

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => (n == null ? '—' : String(n));
const fmtMin = (n) => {
  if (n == null) return '—';
  const m = Math.floor(n);
  const s = Math.round((n - m) * 60);
  return s > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${m}:00`;
};

// ── Shared fetch hook ─────────────────────────────────────────────────────────
function useApi(urls, interval = REFRESH_MS) {
  const [data, setData]       = useState(urls.map(() => null));
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetch_ = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setError(null);
      const results = await Promise.all(
        urls.map(u => fetch(u, { headers: H }).then(r => r.ok ? r.json() : null))
      );
      setData(results);
    } catch {
      setError('Cannot reach server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const id = setInterval(() => fetch_(), interval);
    return () => clearInterval(id);
  }, [fetch_]);

  const refresh = () => fetch_(true);
  return { data, loading, error, refreshing, refresh };
}

// ── Store hours check (phone local time) ─────────────────────────────────────
const SHOP_OPEN_MIN  = 8  * 60 + 30;  // 08:30
const SHOP_CLOSE_MIN = 20 * 60 + 30;  // 20:30

function isStoreOpen() {
  const now = new Date();
  const tot = now.getHours() * 60 + now.getMinutes();
  return tot >= SHOP_OPEN_MIN && tot < SHOP_CLOSE_MIN;
}

function closedBannerText() {
  const now = new Date();
  const tot = now.getHours() * 60 + now.getMinutes();
  if (tot < SHOP_OPEN_MIN) {
    const diff = SHOP_OPEN_MIN - tot;
    const h = Math.floor(diff / 60), m = diff % 60;
    return h > 0 ? `Store closed · Opens in ${h}h ${m.toString().padStart(2,'0')}m` : `Store closed · Opens in ${m} min`;
  }
  return 'Store closed · Data from last session';
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('forecast');
  const [time, setTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [storeOpen, setStoreOpen] = useState(isStoreOpen());
  const [closedText, setClosedText] = useState(closedBannerText());

  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setStoreOpen(isStoreOpen());
      setClosedText(closedBannerText());
    }, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.surface} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.logoChip}>
            <Text style={s.logoText}>IQMS</Text>
          </View>
          <Text style={s.storeName}>Queue Manager</Text>
        </View>
        <View style={s.liveChip}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>{time}</Text>
        </View>
      </View>

      {/* ── Tab Bar ────────────────────────────────────────────────────────── */}
      <View style={s.tabBar}>
        {['live', 'forecast', 'today'].map(t => (
          <TouchableOpacity
            key={t}
            style={[s.tabBtn, tab === t && s.tabBtnActive]}
            onPress={() => setTab(t)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Closed banner ──────────────────────────────────────────────────── */}
      {!storeOpen && (
        <View style={s.closedBanner}>
          <Text style={s.closedIcon}>🔒</Text>
          <Text style={s.closedText}>{closedText}</Text>
        </View>
      )}

      {/* ── Screens ────────────────────────────────────────────────────────── */}
      {tab === 'live'     && <LiveScreen />}
      {tab === 'forecast' && <ForecastScreen />}
      {tab === 'today'    && <TodayScreen />}
    </SafeAreaView>
  );
}

// ── Live Screen ───────────────────────────────────────────────────────────────
function LiveScreen() {
  const { data, loading, error, refreshing, refresh } = useApi([
    `${API_URL}/live-lanes`,
    `${API_URL}/alerts`,
  ]);
  const { data: snapData } = useApi([
    `${API_URL}/snapshot/checkout`,
    `${API_URL}/snapshot/entrance`,
  ], 60000);
  const camImgH = Math.round((Dimensions.get('window').width - 28 - 10) / 2 * 3 / 4);
  const [lanesData, alertData] = data;

  if (loading) return <Loader />;

  const lanes    = lanesData?.lanes    || [];
  const snapshot = lanesData?.snapshot || {};
  const alert    = alertData;
  const alertS   = alert?.level ? ALERT_STYLE[alert.level] : null;

  const sendResponse = async (response) => {
    try {
      await fetch(`${API_URL}/alert-response`, {
        method: 'POST',
        headers: { ...H, 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      });
    } catch {}
  };

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.screenContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.accent} />}
      showsVerticalScrollIndicator={false}
    >
      {error && <ErrorBanner msg={error} />}

      {/* Alert Banner */}
      {alert?.level && alertS && (
        <View style={[s.alertBanner, { backgroundColor: alertS.bg, borderColor: alertS.border }]}>
          <View style={s.alertBannerTop}>
            <View style={[s.alertIconBox, { backgroundColor: alertS.border + '33' }]}>
              <Text style={{ fontSize: 14 }}>⚠</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.alertBannerTitle, { color: alertS.color }]}>{alert.message}</Text>
            </View>
            <TouchableOpacity
              style={[s.openBtn, { backgroundColor: alertS.border }]}
              onPress={() => sendResponse('opening_lane')}
              activeOpacity={0.8}
            >
              <Text style={s.openBtnText}>OPEN</Text>
            </TouchableOpacity>
          </View>
          <View style={s.alertBtnRow}>
            {[
              { key: 'cannot_open', label: 'Cannot Open' },
              { key: 'false_alarm', label: 'False Alarm' },
            ].map(b => (
              <TouchableOpacity key={b.key} style={s.alertSecondBtn} onPress={() => sendResponse(b.key)} activeOpacity={0.8}>
                <Text style={s.alertSecondBtnText}>{b.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Section Label */}
      <View style={s.sectionRow}>
        <View style={[s.sectionDot, { backgroundColor: C.green }]} />
        <Text style={s.sectionLabel}>LIVE QUEUE STATUS</Text>
        <Text style={s.sectionRight}>updates every 15s</Text>
      </View>

      {/* Lane Cards */}
      {lanes.map(lane => {
        const ls = LANE_STATUS[lane.status] || LANE_STATUS.closed;
        const fillPct = Math.min((lane.fill / lane.fill_max) * 100, 100);
        return (
          <View key={lane.lane_number} style={[s.laneCard, { backgroundColor: ls.bg, borderColor: ls.color + '44' }]}>
            <View style={s.laneCardTop}>
              <Text style={s.laneNumber}>LANE {String(lane.lane_number).padStart(2, '0')}</Text>
              <View style={[s.statusBadge, { backgroundColor: ls.color + '22', borderColor: ls.color }]}>
                <View style={[s.statusDot2, { backgroundColor: ls.color }]} />
                <Text style={[s.statusBadgeText, { color: ls.color }]}>{ls.label}</Text>
              </View>
              <Text style={[s.laneAvg, { color: ls.color }]}>
                avg {lane.status === 'closed' ? '—' : fmtMin(lane.avg_wait_min)}
              </Text>
            </View>

            <View style={s.laneCardMid}>
              <Text style={[s.waitingNum, { color: ls.color }]}>
                {lane.status === 'closed' ? '—' : lane.waiting}
              </Text>
              <Text style={s.waitingLabel}>WAITING</Text>

              <View style={s.fillSection}>
                <View style={s.fillBarBg}>
                  <View style={[s.fillBarFg, { width: `${fillPct}%`, backgroundColor: ls.color }]} />
                </View>
                <Text style={s.fillLabel}>
                  {lane.status === 'closed' ? 'CLOSED' : `FILL   ${lane.fill} / ${lane.fill_max}`}
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* Snapshot */}
      <View style={s.sectionRow}>
        <View style={[s.sectionDot, { backgroundColor: C.purple }]} />
        <Text style={s.sectionLabel}>SNAPSHOT</Text>
        <Text style={s.sectionRight}>now</Text>
      </View>

      <View style={s.snapshotRow}>
        <View style={[s.snapshotCard, { borderColor: C.border }]}>
          <Text style={s.snapshotVal}>{fmt(snapshot.total_in_queue)}</Text>
          <Text style={s.snapshotLbl}>IN QUEUE</Text>
          <Text style={s.snapshotSub}>across {snapshot.open_lanes || 0} open lanes</Text>
        </View>
        <View style={[s.snapshotCard, { borderColor: C.border }]}>
          <Text style={[s.snapshotVal, { color: C.yellow }]}>{fmtMin(snapshot.avg_wait_min)}</Text>
          <Text style={s.snapshotLbl}>AVG WAIT</Text>
          <Text style={s.snapshotSub}>min</Text>
        </View>
      </View>

      {/* Camera snapshots */}
      <View style={[s.sectionRow, { marginTop: 8 }]}>
        <View style={[s.sectionDot, { backgroundColor: C.textDim }]} />
        <Text style={s.sectionLabel}>LIVE CAMERAS</Text>
        <Text style={s.sectionRight}>updates every 60s</Text>
      </View>
      <View style={s.cameraRow}>
        {[
          { label: 'CHECKOUT', img: snapData?.[0]?.image },
          { label: 'ENTRANCE', img: snapData?.[1]?.image },
        ].map(cam => (
          <View key={cam.label} style={[s.cameraCard, { borderColor: C.border }]}>
            <Text style={s.cameraLabel}>{cam.label}</Text>
            {cam.img
              ? <Image source={{ uri: cam.img }} style={[s.cameraImage, { height: camImgH }]} resizeMode="contain" />
              : <View style={[s.cameraImage, { height: camImgH }]} />}
          </View>
        ))}
      </View>

      <View style={s.spacer} />
    </ScrollView>
  );
}

// ── Forecast Screen ───────────────────────────────────────────────────────────
function ForecastScreen() {
  const [chartHorizon, setChartHorizon] = useState('60min');
  const { data, loading, error, refreshing, refresh } = useApi([
    `${API_URL}/forecast`,
    `${API_URL}/forecast-chart`,
    `${API_URL}/forecast-chart-3h`,
  ]);
  const [forecastData, chartData, chartData3h] = data;

  if (loading) return <Loader />;

  const scenarios   = forecastData?.lane_scenarios || [];
  const waitNow     = forecastData?.wait_now_min;
  const wait5       = forecastData?.wait_5_min;
  const wait10      = forecastData?.wait_10_min;
  const wait15      = forecastData?.wait_15_min;
  const activeLanes = forecastData?.current_lanes || 1;
  const slots        = chartData?.slots   || [];
  const slots3h      = chartData3h?.slots || [];
  const activeSlots  = chartHorizon === '3h' ? slots3h : slots;

  const waitColor = (w) => {
    if (w == null) return C.textSub;
    if (w > 10) return C.red;
    if (w > 7)  return C.orange;
    if (w > 4)  return C.yellow;
    return C.green;
  };

  // Forecast detail derived from existing data
  const now = new Date();
  const winEnd = new Date(now.getTime() + 15 * 60000);
  const fmtTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const allWaits = [waitNow, wait5, wait10, wait15].filter(v => v != null);
  const peakWait = allWaits.length ? Math.max(...allWaits) : null;

  // Chart data
  const waitLine     = activeSlots.map((sl, i) => ({ x: i, y: sl.wait_min }));
  const arrivalsLine = activeSlots.map((sl, i) => ({ x: i, y: sl.arrivals }));
  const chartW       = Dimensions.get('window').width - 28;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.screenContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.accent} />}
      showsVerticalScrollIndicator={false}
    >
      {error && <ErrorBanner msg={error} />}

      {/* Forecast header */}
      <View style={s.sectionRow}>
        <View style={[s.sectionDot, { backgroundColor: C.yellow }]} />
        <Text style={s.sectionLabel}>15-MIN FORECAST</Text>
        <Text style={s.sectionRight}></Text>
      </View>

      {/* Wait cards NOW / +5 / +10 / +15 — fixed font scaling */}
      <View style={s.waitCardsRow}>
        {[
          { label: 'NOW',     value: waitNow },
          { label: '+5 MIN',  value: wait5   },
          { label: '+10 MIN', value: wait10  },
          { label: '+15 MIN', value: wait15  },
        ].map(card => (
          <View key={card.label} style={[s.waitCard, { borderColor: C.border }]}>
            <Text style={s.waitCardLabel}>{card.label}</Text>
            <Text
              style={[s.waitCardValue, { color: waitColor(card.value) }]}
              adjustsFontSizeToFit
              numberOfLines={1}
            >
              {fmtMin(card.value)}
            </Text>
            <Text style={s.waitCardUnit}>min</Text>
          </View>
        ))}
      </View>

      {/* Forecast Detail */}
      <View style={[s.sectionRow, { marginTop: 10 }]}>
        <View style={[s.sectionDot, { backgroundColor: C.blue }]} />
        <Text style={s.sectionLabel}>FORECAST DETAIL</Text>
      </View>

      <View style={s.detailRow}>
        {[
          { label: 'NEXT SLOT',        value: fmtTime(now),    sub: 'Current time window'   },
          { label: 'PEAK WAIT',        value: peakWait != null ? fmtMin(peakWait) : '—', sub: 'Highest in 15 min', color: waitColor(peakWait) },
          { label: 'WINDOW END',       value: fmtTime(winEnd), sub: 'End of 15-min view'    },
        ].map(item => (
          <View key={item.label} style={[s.detailCard, { borderColor: C.border }]}>
            <Text style={s.detailLabel}>{item.label}</Text>
            <Text style={[s.detailValue, item.color ? { color: item.color } : {}]}
              adjustsFontSizeToFit numberOfLines={1}>
              {item.value}
            </Text>
            <Text style={s.detailSub}>{item.sub}</Text>
          </View>
        ))}
      </View>

      {/* Chart with horizon toggle */}
      {(slots.length > 2 || slots3h.length > 2) && (
        <>
          <View style={[s.sectionRow, { marginTop: 10 }]}>
            <View style={[s.sectionDot, { backgroundColor: C.accent }]} />
            <Text style={s.sectionLabel}>{chartHorizon === '3h' ? '3-HOUR OUTLOOK' : '60-MIN OUTLOOK'}</Text>
            <View style={s.horizonToggle}>
              {['60min', '3h'].map(h => (
                <TouchableOpacity
                  key={h}
                  style={[s.horizonBtn, chartHorizon === h && s.horizonBtnActive]}
                  onPress={() => setChartHorizon(h)}
                  activeOpacity={0.8}
                >
                  <Text style={[s.horizonBtnText, chartHorizon === h && s.horizonBtnTextActive]}>
                    {h === '60min' ? '60m' : '3h'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[s.chartLegend, { marginLeft: 8 }]}>
              <View style={[s.legendDot, { backgroundColor: C.orange }]} />
              <Text style={s.legendTxt}>Wait</Text>
              <View style={[s.legendDot, { backgroundColor: C.blue, marginLeft: 8 }]} />
              <Text style={s.legendTxt}>Arrivals</Text>
            </View>
          </View>

          <View style={[s.chartCard, { borderColor: C.border }]}>
            <VictoryChart
              width={chartW}
              height={180}
              padding={{ top: 10, bottom: 30, left: 36, right: 16 }}
              theme={VictoryTheme.material}
            >
              <VictoryAxis
                tickCount={5}
                tickFormat={(i) => activeSlots[Math.round(i)]?.time ?? ''}
                style={{
                  axis: { stroke: C.border },
                  tickLabels: { fill: C.textDim, fontSize: 9 },
                  grid: { stroke: 'transparent' },
                }}
              />
              <VictoryAxis
                dependentAxis
                style={{
                  axis: { stroke: C.border },
                  tickLabels: { fill: C.textDim, fontSize: 9 },
                  grid: { stroke: C.border, strokeDasharray: '4' },
                }}
              />
              <VictoryArea
                data={arrivalsLine}
                style={{ data: { fill: C.blue + '22', stroke: C.blue, strokeWidth: 1.5 } }}
                interpolation="monotoneX"
              />
              <VictoryLine
                data={waitLine}
                style={{ data: { stroke: C.orange, strokeWidth: 2 } }}
                interpolation="monotoneX"
              />
            </VictoryChart>
          </View>
        </>
      )}

      {/* Lane Scenarios — tap to toggle open/closed */}
      <View style={[s.sectionRow, { marginTop: 8 }]}>
        <View style={[s.sectionDot, { backgroundColor: C.green }]} />
        <Text style={s.sectionLabel}>LANE SCENARIOS</Text>
        <Text style={s.sectionRight}>tap to set open lanes</Text>
      </View>

      <View style={[s.scenariosCard, { borderColor: C.border }]}>
        {scenarios.map(sc => {
          const isActive = sc.lanes === activeLanes;
          const color = SCENARIO_COLOR[sc.color] || C.textSub;
          const barWidth = sc.est_wait_min > 0 ? Math.min((sc.est_wait_min / 15) * 100, 100) : 5;
          return (
            <TouchableOpacity
              key={sc.lanes}
              style={[s.scenarioRow, isActive && s.scenarioRowActive]}
              onPress={async () => {
                try {
                  await fetch(`${API_URL}/set-lanes`, {
                    method: 'POST',
                    headers: { ...H, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lanes: sc.lanes }),
                  });
                  refresh();
                } catch {}
              }}
              activeOpacity={0.75}
            >
              <View style={[s.scenarioLaneBox, isActive && { backgroundColor: C.accent }]}>
                <Text style={[s.scenarioLaneText, isActive && { color: '#fff' }]}>
                  {sc.lanes} lane{sc.lanes > 1 ? 's' : ''}
                </Text>
              </View>
              <View style={s.scenarioBarBg}>
                <View style={[s.scenarioBarFg, { width: `${barWidth}%`, backgroundColor: color }]} />
              </View>
              <View style={s.scenarioRight}>
                <Text style={[s.scenarioWait, { color }]}>{fmtMin(sc.est_wait_min)}</Text>
                {isActive && <Text style={s.scenarioOpen}>OPEN</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={s.spacer} />
    </ScrollView>
  );
}

// ── Today Screen ──────────────────────────────────────────────────────────────
function TodayScreen() {
  const { data, loading, error, refreshing, refresh } = useApi([
    `${API_URL}/day-recap`,
  ]);
  const [recap] = data;

  if (loading) return <Loader />;

  const equipment           = recap?.equipment             || [];
  const demographicsGender  = (recap?.demographics_gender  || []).filter(g => g.key !== 'unknown');
  const demographicsAge     = recap?.demographics_age      || [];
  const entriesByHour       = recap?.entries_by_hour       || [];
  const chartW              = Dimensions.get('window').width - 28;

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.screenContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={C.accent} />}
      showsVerticalScrollIndicator={false}
    >
      {error && <ErrorBanner msg={error} />}

      {/* Summary */}
      <View style={s.sectionRow}>
        <View style={[s.sectionDot, { backgroundColor: C.blue }]} />
        <Text style={s.sectionLabel}>SUMMARY</Text>
        {recap?.date && <Text style={s.sectionRight}>{recap.date}</Text>}
      </View>

      <View style={[s.summaryCard, { borderColor: C.border }]}>
        {[
          { label: 'TOTAL CUSTOMERS', value: recap?.total_customers?.toLocaleString(), color: C.cyan,   big: true  },
          { label: 'AVG CHECKOUT',     value: fmtMin(recap?.avg_wait_min),              color: C.text,   big: false,
            suffix: 'min' },
          { label: 'BUSIEST HOUR',
            value: recap?.peak_hour ? `${recap.peak_hour}` : '—',
            extra: recap?.peak_hour_end ? `– ${recap.peak_hour_end} · ${recap.peak_count}` : '',
            color: C.text, big: false },
          { label: 'LANES USED',
            value: recap?.lanes_today != null ? `${recap.lanes_today}` : '—',
            extra: recap?.busiest_lane ? `busiest: ${recap.busiest_lane}` : '',
            color: C.text, big: false },
          { label: 'ALERT TIME',
            value: recap?.alert_minutes != null ? `${recap.alert_minutes}` : '—',
            suffix: 'min',
            color: recap?.alert_minutes > 0 ? C.red : C.text, big: false },
        ].map((item, i, arr) => (
          <View key={item.label}>
            <View style={s.summaryRow_}>
              <Text style={s.summaryLbl}>{item.label}</Text>
              <View style={s.summaryValRow}>
                <Text style={[s.summaryVal, item.big && s.summaryValBig, { color: item.color }]}>
                  {item.value ?? '—'}
                </Text>
                {item.suffix && <Text style={s.summaryUnit}> {item.suffix}</Text>}
                {item.extra  && <Text style={s.summaryExtra}> {item.extra}</Text>}
              </View>
            </View>
            {i < arr.length - 1 && <View style={[s.divider, { backgroundColor: C.border }]} />}
          </View>
        ))}
      </View>

      {/* Equipment Mix */}
      <View style={[s.sectionRow, { marginTop: 8 }]}>
        <View style={[s.sectionDot, { backgroundColor: C.purple }]} />
        <Text style={s.sectionLabel}>EQUIPMENT MIX</Text>
      </View>

      <View style={[s.equipCard, { borderColor: C.border }]}>
        {equipment.filter(eq => eq.type !== 'personal_bag').map((eq, i, arr) => (
          <View key={eq.type}>
            <View style={s.equipRow}>
              <View style={[s.equipIcon, { backgroundColor: eq.color + '22' }]}>
                <Text style={{ fontSize: 16 }}>
                  {eq.type === 'trolley' ? '🛒' : '🧺'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.equipLabelRow}>
                  <Text style={s.equipLabel}>{eq.label}</Text>
                  <Text style={[s.equipPct, { color: eq.color }]}>{eq.percent}%</Text>
                </View>
                <View style={s.equipBarBg}>
                  <View style={[s.equipBarFg, { width: `${eq.percent}%`, backgroundColor: eq.color }]} />
                </View>
                <Text style={s.equipCount}>{eq.count.toLocaleString()} customers</Text>
              </View>
            </View>
            {i < arr.length - 1 && <View style={[s.divider, { backgroundColor: C.border }]} />}
          </View>
        ))}
        {equipment.length === 0 && (
          <Text style={[s.emptyText, { color: C.textDim }]}>No equipment data yet today</Text>
        )}
      </View>

      {/* Customer Demographics */}
      <View style={[s.sectionRow, { marginTop: 8 }]}>
        <View style={[s.sectionDot, { backgroundColor: C.accent }]} />
        <Text style={s.sectionLabel}>CUSTOMER DEMOGRAPHICS</Text>
      </View>

      <View style={[s.demoCard, { borderColor: C.border }]}>

        {/* Gender donut */}
        <Text style={s.demoSubTitle}>GENDER</Text>
        {demographicsGender.length > 0 ? (
          <View style={s.genderRow}>
            <VictoryPie
              data={demographicsGender.map(g => ({ x: g.label, y: g.count }))}
              colorScale={demographicsGender.map(g => g.color)}
              width={160} height={160}
              innerRadius={50}
              padding={10}
              labels={() => null}
            />
            <View style={s.genderLegend}>
              {demographicsGender.map(g => (
                <View key={g.key} style={s.genderLegendRow}>
                  <View style={[s.genderDot, { backgroundColor: g.color }]} />
                  <View>
                    <Text style={[s.genderPct, { color: g.color }]}>{g.percent}%</Text>
                    <Text style={s.genderLbl}>{g.label}</Text>
                    <Text style={s.genderCount}>{g.count.toLocaleString()} visitors</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : <Text style={[s.emptyText, { color: C.textDim }]}>No gender data yet today</Text>}

        {demographicsAge.length > 0 && (
          <>
            <View style={[s.divider, { backgroundColor: C.border, marginVertical: 10 }]} />
            {/* Age Groups */}
            <Text style={s.demoSubTitle}>AGE GROUPS</Text>
            <View style={s.ageRow}>
              {demographicsAge.map(ag => (
                <View key={ag.group} style={s.ageCard}>
                  <Text style={[s.agePct, { color: ag.color }]}>{ag.percent}%</Text>
                  <View style={s.ageBarBg}>
                    <View style={[s.ageBarFg, { height: `${ag.percent}%`, backgroundColor: ag.color }]} />
                  </View>
                  <Text style={s.ageLabel}>{ag.group}</Text>
                  <Text style={s.ageCount}>{ag.count.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>

      {/* Entries by Hour */}
      {entriesByHour.length > 0 && (
        <>
          <View style={[s.sectionRow, { marginTop: 8 }]}>
            <View style={[s.sectionDot, { backgroundColor: C.blue }]} />
            <Text style={s.sectionLabel}>ENTRIES BY HOUR</Text>
            <Text style={s.sectionRight}>traffic pattern</Text>
          </View>
          <View style={[s.chartCard, { borderColor: C.border }]}>
            <VictoryChart
              width={chartW} height={200}
              padding={{ top: 20, bottom: 36, left: 40, right: 16 }}
              domainPadding={{ x: 20 }}
            >
              <VictoryAxis
                tickFormat={t => entriesByHour[Math.round(t)]?.hour ?? ''}
                tickCount={Math.min(entriesByHour.length, 6)}
                style={{
                  axis: { stroke: C.border },
                  tickLabels: { fill: C.textDim, fontSize: 9 },
                  grid: { stroke: 'transparent' },
                }}
              />
              <VictoryAxis
                dependentAxis
                style={{
                  axis: { stroke: C.border },
                  tickLabels: { fill: C.textDim, fontSize: 9 },
                  grid: { stroke: C.border, strokeDasharray: '4' },
                }}
              />
              <VictoryBar
                data={entriesByHour.map((h, i) => ({ x: i, y: h.count, peak: h.is_peak }))}
                style={{
                  data: {
                    fill: ({ datum }) => datum.peak ? C.red : C.blue,
                    borderRadius: 3,
                  },
                }}
                barWidth={Math.max(8, (chartW - 56) / entriesByHour.length - 4)}
              />
            </VictoryChart>
          </View>
        </>
      )}

      <View style={s.spacer} />
    </ScrollView>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function Loader() {
  return (
    <View style={s.loader}>
      <ActivityIndicator size="large" color={C.accent} />
    </View>
  );
}

function ErrorBanner({ msg }) {
  return (
    <View style={s.errorBanner}>
      <Text style={s.errorText}>⚠ {msg}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:           { flex: 1, backgroundColor: C.bg },
  loader:         { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  screen:         { flex: 1, backgroundColor: C.bg },
  screenContent:  { padding: 14 },
  spacer:         { height: 32 },

  // Header
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    backgroundColor: C.surface, paddingHorizontal: 16, paddingVertical: 12,
                    borderBottomWidth: 1, borderBottomColor: C.border },
  headerLeft:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoChip:       { backgroundColor: C.accent, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6 },
  logoText:       { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 1 },
  storeName:      { color: C.textSub, fontSize: 12, fontWeight: '500' },
  liveChip:       { flexDirection: 'row', alignItems: 'center', gap: 6,
                    backgroundColor: '#1a2e22', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  liveDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  liveText:       { color: C.green, fontSize: 12, fontWeight: '700' },

  // Tab bar
  tabBar:         { flexDirection: 'row', backgroundColor: C.surface,
                    borderBottomWidth: 1, borderBottomColor: C.border },
  tabBtn:         { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive:   { borderBottomWidth: 2, borderBottomColor: C.accent },
  tabText:        { color: C.textSub, fontSize: 13, fontWeight: '500' },
  tabTextActive:  { color: C.text, fontWeight: '700' },

  // Section labels
  sectionRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  sectionDot:     { width: 7, height: 7, borderRadius: 4 },
  sectionLabel:   { color: C.textSub, fontSize: 11, fontWeight: '700', letterSpacing: 1, flex: 1 },
  sectionRight:   { color: C.textDim, fontSize: 11 },

  // Closed banner
  closedBanner:   { flexDirection: 'row', alignItems: 'center', gap: 8,
                    backgroundColor: '#1c2128', borderBottomWidth: 1,
                    borderBottomColor: C.border, paddingHorizontal: 16, paddingVertical: 8 },
  closedIcon:     { fontSize: 13 },
  closedText:     { color: C.textSub, fontSize: 12, fontWeight: '600' },

  // Error
  errorBanner:    { backgroundColor: '#2d1a1a', borderRadius: 8, padding: 12, marginBottom: 12,
                    borderWidth: 1, borderColor: C.red },
  errorText:      { color: C.red, fontSize: 13 },

  // Alert banner
  alertBanner:    { borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1 },
  alertBannerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertIconBox:   { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  alertBannerTitle: { fontSize: 13, fontWeight: '600', color: C.text, flex: 1 },
  openBtn:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  openBtnText:    { color: '#fff', fontSize: 12, fontWeight: '800' },
  alertBtnRow:    { flexDirection: 'row', gap: 8, marginTop: 10 },
  alertSecondBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                    backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border },
  alertSecondBtnText: { color: C.textSub, fontSize: 12, fontWeight: '600' },

  // Lane cards
  laneCard:       { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  laneCardTop:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  laneNumber:     { fontSize: 12, fontWeight: '700', color: C.textSub, letterSpacing: 0.5, flex: 0 },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5,
                    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  statusDot2:     { width: 5, height: 5, borderRadius: 3 },
  statusBadgeText:{ fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  laneAvg:        { marginLeft: 'auto', fontSize: 13, fontWeight: '600' },
  laneCardMid:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
  waitingNum:     { fontSize: 36, fontWeight: '800', lineHeight: 42, minWidth: 44 },
  waitingLabel:   { fontSize: 10, color: C.textDim, marginLeft: -10 },
  fillSection:    { flex: 1 },
  fillBarBg:      { height: 6, backgroundColor: C.border, borderRadius: 3, marginBottom: 5 },
  fillBarFg:      { height: 6, borderRadius: 3 },
  fillLabel:      { fontSize: 10, color: C.textDim },

  // Snapshot
  snapshotRow:    { flexDirection: 'row', gap: 10, marginBottom: 4 },
  snapshotCard:   { flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 16, borderWidth: 1 },
  snapshotVal:    { fontSize: 32, fontWeight: '800', color: C.text },
  snapshotLbl:    { fontSize: 10, color: C.textSub, fontWeight: '700', letterSpacing: 0.8, marginTop: 4 },
  snapshotSub:    { fontSize: 11, color: C.textDim, marginTop: 3 },

  // Forecast wait cards
  waitCardsRow:   { flexDirection: 'row', gap: 8, marginBottom: 16 },
  waitCard:       { flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 12,
                    borderWidth: 1, alignItems: 'flex-start' },
  waitCardLabel:  { fontSize: 9, fontWeight: '700', color: C.textSub, letterSpacing: 0.8, marginBottom: 4 },
  waitCardValue:  { fontSize: 22, fontWeight: '800', width: '100%' },
  waitCardUnit:   { fontSize: 10, color: C.textDim, marginTop: 2 },

  // Forecast detail cards
  detailRow:      { flexDirection: 'row', gap: 8, marginBottom: 14 },
  detailCard:     { flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 10,
                    borderWidth: 1, alignItems: 'flex-start' },
  detailLabel:    { fontSize: 8, fontWeight: '700', color: C.textSub, letterSpacing: 0.8, marginBottom: 4 },
  detailValue:    { fontSize: 16, fontWeight: '800', color: C.text, width: '100%' },
  detailSub:      { fontSize: 9, color: C.textDim, marginTop: 3 },

  // Chart
  chartCard:      { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1,
                    marginBottom: 14, overflow: 'hidden' },
  chartLegend:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot:      { width: 7, height: 7, borderRadius: 4 },
  legendTxt:      { fontSize: 10, color: C.textDim },

  // Camera snapshots
  cameraRow:   { flexDirection: 'row', gap: 10, marginBottom: 4 },
  cameraCard:  { flex: 1, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cameraLabel: { fontSize: 9, fontWeight: '700', color: C.textSub, letterSpacing: 0.8, padding: 8, paddingBottom: 4 },
  cameraImage: { width: '100%', backgroundColor: C.surface2 },

  // Horizon toggle
  horizonToggle:        { flexDirection: 'row', gap: 4 },
  horizonBtn:           { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                          backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border },
  horizonBtnActive:     { backgroundColor: C.accent, borderColor: C.accent },
  horizonBtnText:       { fontSize: 10, fontWeight: '600', color: C.textSub },
  horizonBtnTextActive: { color: '#fff' },

  // Lane scenarios
  scenariosCard:  { backgroundColor: C.surface, borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 4 },
  scenarioRow:    { flexDirection: 'row', alignItems: 'center', gap: 10,
                    paddingVertical: 10, borderRadius: 8 },
  scenarioRowActive: { backgroundColor: C.surface2, paddingHorizontal: 8, marginHorizontal: -8 },
  scenarioLaneBox:   { width: 64, paddingVertical: 5, borderRadius: 8, alignItems: 'center',
                       backgroundColor: C.surface2 },
  scenarioLaneText:  { color: C.textSub, fontSize: 11, fontWeight: '600' },
  scenarioBarBg:     { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3 },
  scenarioBarFg:     { height: 6, borderRadius: 3 },
  scenarioRight:     { width: 56, alignItems: 'flex-end' },
  scenarioWait:      { fontSize: 14, fontWeight: '700' },
  scenarioOpen:      { fontSize: 9, color: C.accent, fontWeight: '700', letterSpacing: 0.5 },

  // Summary (Today)
  summaryCard:    { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1,
                    overflow: 'hidden', marginBottom: 14 },
  summaryRow_:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                    paddingVertical: 16, paddingHorizontal: 16 },
  summaryLbl:     { fontSize: 11, color: C.textSub, fontWeight: '600', letterSpacing: 0.8 },
  summaryValRow:  { flexDirection: 'row', alignItems: 'baseline' },
  summaryVal:     { fontSize: 18, fontWeight: '700', color: C.text },
  summaryValBig:  { fontSize: 26 },
  summaryUnit:    { fontSize: 12, color: C.textSub },
  summaryExtra:   { fontSize: 11, color: C.textSub },
  divider:        { height: 1, marginHorizontal: 0 },

  // Equipment
  equipCard:      { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1,
                    overflow: 'hidden', marginBottom: 4 },
  equipRow:       { flexDirection: 'row', alignItems: 'center', gap: 12,
                    paddingVertical: 16, paddingHorizontal: 14 },
  equipIcon:      { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  equipLabelRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  equipLabel:     { color: C.text, fontSize: 14, fontWeight: '600' },
  equipPct:       { fontSize: 14, fontWeight: '700' },
  equipBarBg:     { height: 5, backgroundColor: C.border, borderRadius: 3, marginBottom: 5 },
  equipBarFg:     { height: 5, borderRadius: 3 },
  equipCount:     { color: C.textDim, fontSize: 11 },
  emptyText:      { padding: 20, textAlign: 'center', fontSize: 13 },

  // Gender donut
  genderRow:       { flexDirection: 'row', alignItems: 'center' },
  genderLegend:    { flex: 1, gap: 14, paddingLeft: 8 },
  genderLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  genderDot:       { width: 10, height: 10, borderRadius: 5 },
  genderPct:       { fontSize: 20, fontWeight: '800' },
  genderLbl:       { fontSize: 12, fontWeight: '600', color: C.text },
  genderCount:     { fontSize: 11, color: C.textDim },

  // Demographics
  demoCard:       { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1,
                    overflow: 'hidden', marginBottom: 4, padding: 14 },
  demoSubTitle:   { fontSize: 10, fontWeight: '700', color: C.textSub, letterSpacing: 1, marginBottom: 10 },
  demoRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  demoRowLabel:   { fontSize: 13, fontWeight: '600', color: C.text, width: 70 },
  demoBarWrap:    { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3 },
  demoBarFg:      { height: 6, borderRadius: 3 },
  demoPct:        { fontSize: 13, fontWeight: '700', width: 38, textAlign: 'right' },
  demoCount:      { fontSize: 11, color: C.textDim, marginBottom: 2, marginLeft: 78 },
  ageRow:         { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 4 },
  ageCard:        { flex: 1, alignItems: 'center', gap: 4 },
  agePct:         { fontSize: 14, fontWeight: '800' },
  ageBarBg:       { width: 28, height: 80, backgroundColor: C.border, borderRadius: 4,
                    justifyContent: 'flex-end', overflow: 'hidden' },
  ageBarFg:       { width: '100%', borderRadius: 4 },
  ageLabel:       { fontSize: 11, fontWeight: '600', color: C.text },
  ageCount:       { fontSize: 10, color: C.textDim },
});