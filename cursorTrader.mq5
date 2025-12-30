#property strict
#property description "CursorTrader EA - Pin-bar and Donchian Breakout Strategy"
#property version   "1.00"

input bool   InpEnablePinBar      = true;
input bool   InpEnableBreakout    = true;
input int    InpDonchianPeriod    = 20;
input int    InpATRPeriod         = 14;
input double InpATRMult           = 1.5;
input int    InpHoldBars          = 5;          // Increased from 3
input double InpRiskPct           = 1.0;
input bool   InpUseFixedLot       = false;
input double InpFixedLot          = 0.10;
input double InpMaxLotSize        = 0.05;
input double InpMaxSpreadPoints   = 0.0;
input int    InpSlippagePoints    = 5;
input long   InpMagic             = 990099;
// Enhanced profitability filters
input bool   InpUseTrendFilter    = true;       // Filter trades by EMA trend
input int    InpEMAPeriod         = 50;         // EMA period for trend
input double InpPinBarRR          = 2.0;        // Risk:Reward for pin bars (was 1.0)
input double InpBreakoutRR        = 2.0;        // Risk:Reward for breakouts
input bool   InpUseVolumeFilter   = true;       // Only trade on higher volume
input double InpVolumeMultiplier  = 1.2;        // Volume must be X times average
input bool   InpUseHTFTrend       = false;      // Use higher timeframe trend
input ENUM_TIMEFRAMES InpHTF      = PERIOD_H4;  // Higher timeframe
input bool   InpUseTrailingStop   = true;       // Enable trailing stop
input double InpTrailingStopPct   = 50.0;       // Trail stop by X% of profit
input int    InpMinFiltersToPass  = 1;          // Min number of filters that must pass (0..3)
input bool   InpDebugFilters      = false;      // Log filter rejections for debugging

datetime g_lastBarTime = 0;
datetime g_lastPinSignal = 0;
datetime g_lastBreakoutSignal = 0;

int OnInit() {
  Print("=== CursorTrader EA Initialized ===");
  Print("Symbol: ", _Symbol, " Period: ", EnumToString(_Period));
  Print("Pin Bar Strategy: ", (InpEnablePinBar ? "ENABLED" : "DISABLED"));
  Print("Breakout Strategy: ", (InpEnableBreakout ? "ENABLED" : "DISABLED"));
  Print("Trend Filter: ", (InpUseTrendFilter ? "ENABLED (EMA " + IntegerToString(InpEMAPeriod) + ")" : "DISABLED"));
  Print("Volume Filter: ", (InpUseVolumeFilter ? "ENABLED (multiplier " + DoubleToString(InpVolumeMultiplier, 2) + ")" : "DISABLED"));
  Print("HTF Trend: ", (InpUseHTFTrend ? "ENABLED (" + EnumToString(InpHTF) + ")" : "DISABLED"));
  Print("Trailing Stop: ", (InpUseTrailingStop ? "ENABLED" : "DISABLED"));
  Print("Pin Bar R:R: ", DoubleToString(InpPinBarRR, 2));
  Print("Breakout R:R: ", DoubleToString(InpBreakoutRR, 2));
  Print("Hold Bars: ", InpHoldBars);
  Print("Risk per trade: ", DoubleToString(InpRiskPct, 2), "%");
  Print("Max Lot Size: ", DoubleToString(InpMaxLotSize, 2));
  Print("====================================");
  return(INIT_SUCCEEDED);
}

bool IsNewBar() {
  datetime ct = iTime(_Symbol, _Period, 0);
  if (ct != g_lastBarTime) { 
    g_lastBarTime = ct; 
    return true; 
  }
  return false;
}

struct Bar { 
  double open, high, low, close; 
  datetime time; 
};

void ReadBar(int idx, Bar &b) {
  b.open  = iOpen(_Symbol, _Period, idx);
  b.high  = iHigh(_Symbol, _Period, idx);
  b.low   = iLow(_Symbol, _Period, idx);
  b.close = iClose(_Symbol, _Period, idx);
  b.time  = iTime(_Symbol, _Period, idx);
}

bool IsBullPin(const Bar &b) {
  double body = MathAbs(b.close - b.open);
  double upper = b.high - MathMax(b.open, b.close);
  double lower = MathMin(b.open, b.close) - b.low;
  return (lower > body * 2.0 && upper < body && b.close > b.open);
}

bool IsBearPin(const Bar &b) {
  double body = MathAbs(b.close - b.open);
  double upper = b.high - MathMax(b.open, b.close);
  double lower = MathMin(b.open, b.close) - b.low;
  return (upper > body * 2.0 && lower < body && b.close < b.open);
}

double DonchianHigh(int p) {
  double hh = -DBL_MAX;
  for(int i = 1; i <= p; i++) {
    hh = MathMax(hh, iHigh(_Symbol, _Period, i));
  }
  return hh;
}

double DonchianLow(int p) {
  double ll = DBL_MAX;
  for(int i = 1; i <= p; i++) {
    ll = MathMin(ll, iLow(_Symbol, _Period, i));
  }
  return ll;
}

double ComputeATR(int p) {
  double trSum = 0.0;
  int n = MathMin(p, Bars(_Symbol, _Period));
  for(int i = n; i >= 1; i--) {
    double h = iHigh(_Symbol, _Period, i);
    double l = iLow(_Symbol, _Period, i);
    double pc = iClose(_Symbol, _Period, i + 1);
    double tr = MathMax(h - l, MathMax(MathAbs(h - pc), MathAbs(l - pc)));
    trSum += tr;
  }
  if(n <= 0) return 0.0;
  return trSum / n;
}

double GetEMA(int period, int shift = 0) {
  // Need enough bars for EMA calculation
  if(Bars(_Symbol, _Period) < period + shift) return 0.0;
  
  int handle = iMA(_Symbol, _Period, period, 0, MODE_EMA, PRICE_CLOSE);
  if(handle == INVALID_HANDLE) return 0.0;
  
  // Wait for indicator to be ready
  if(BarsCalculated(handle) < period + shift) {
    IndicatorRelease(handle);
    return 0.0;
  }
  
  double ema[];
  ArraySetAsSeries(ema, true);
  if(CopyBuffer(handle, 0, shift, 1, ema) <= 0) {
    IndicatorRelease(handle);
    return 0.0;
  }
  IndicatorRelease(handle);
  return ema[0];
}

double GetAverageVolume(int period) {
  long volSum = 0;
  int n = MathMin(period, Bars(_Symbol, _Period));
  for(int i = 1; i <= n; i++) {
    volSum += iVolume(_Symbol, _Period, i);
  }
  if(n <= 0) return 0.0;
  return (double)volSum / n;
}

bool CheckTrendUP() {
  if(!InpUseTrendFilter) return true;
  double ema = GetEMA(InpEMAPeriod, 0);
  double price = iClose(_Symbol, _Period, 0);
  if(ema <= 0) {
    if(Bars(_Symbol, _Period) < InpEMAPeriod) {
      static bool warnedOnce = false;
      if(!warnedOnce) {
        Print("Trend filter: Not enough bars (", Bars(_Symbol, _Period), ") for EMA(", InpEMAPeriod, ") - allowing trades");
        warnedOnce = true;
      }
    }
    return true; // Allow trade if EMA not available
  }
  return price > ema;
}

bool CheckTrendDOWN() {
  if(!InpUseTrendFilter) return true;
  double ema = GetEMA(InpEMAPeriod, 0);
  double price = iClose(_Symbol, _Period, 0);
  if(ema <= 0) {
    if(Bars(_Symbol, _Period) < InpEMAPeriod) {
      static bool warnedOnce = false;
      if(!warnedOnce) {
        Print("Trend filter: Not enough bars (", Bars(_Symbol, _Period), ") for EMA(", InpEMAPeriod, ") - allowing trades");
        warnedOnce = true;
      }
    }
    return true; // Allow trade if EMA not available
  }
  return price < ema;
}

bool CheckHTFTrendUP() {
  if(!InpUseHTFTrend) return true;
  double htfClose = iClose(_Symbol, InpHTF, 0);
  double htfEma = 0.0;
  int handle = iMA(_Symbol, InpHTF, InpEMAPeriod, 0, MODE_EMA, PRICE_CLOSE);
  if(handle != INVALID_HANDLE) {
    double ema[];
    ArraySetAsSeries(ema, true);
    if(CopyBuffer(handle, 0, 0, 1, ema) > 0) htfEma = ema[0];
    IndicatorRelease(handle);
  }
  if(htfEma <= 0) return true;
  return htfClose > htfEma;
}

bool CheckHTFTrendDOWN() {
  if(!InpUseHTFTrend) return true;
  double htfClose = iClose(_Symbol, InpHTF, 0);
  double htfEma = 0.0;
  int handle = iMA(_Symbol, InpHTF, InpEMAPeriod, 0, MODE_EMA, PRICE_CLOSE);
  if(handle != INVALID_HANDLE) {
    double ema[];
    ArraySetAsSeries(ema, true);
    if(CopyBuffer(handle, 0, 0, 1, ema) > 0) htfEma = ema[0];
    IndicatorRelease(handle);
  }
  if(htfEma <= 0) return true;
  return htfClose < htfEma;
}

bool CheckVolumeFilter() {
  if(!InpUseVolumeFilter) return true;
  long currentVol = iVolume(_Symbol, _Period, 0);
  double avgVol = GetAverageVolume(20);
  if(avgVol <= 0) {
    static bool warnedOnce = false;
    if(!warnedOnce && Bars(_Symbol, _Period) < 20) {
      Print("Volume filter: Not enough bars (", Bars(_Symbol, _Period), ") for avg volume - allowing trades");
      warnedOnce = true;
    }
    return true; // Allow if not enough data
  }
  double requiredVol = avgVol * InpVolumeMultiplier;
  bool passed = (double)currentVol >= requiredVol;
  if(!passed) {
    static int rejectCount = 0;
    rejectCount++;
    if(rejectCount <= 5 || rejectCount % 100 == 0) {
      Print("Volume filter: Current=", currentVol, " Avg=", (long)avgVol, " Required=", (long)requiredVol, " (multiplier=", InpVolumeMultiplier, ")");
    }
  }
  return passed;
}

bool FiltersPass(bool wantLong) {
  int available = 0;
  int passed = 0;
  bool ok;
  string trendDir;

  if(InpUseTrendFilter) {
    available++;
    if(wantLong) {
      ok = CheckTrendUP();
      trendDir = "UP";
    } else {
      ok = CheckTrendDOWN();
      trendDir = "DOWN";
    }
    if(ok) {
      passed++;
    } else {
      if(InpDebugFilters) Print("Filter fail: Trend (", trendDir, ")");
    }
  }

  if(InpUseHTFTrend) {
    available++;
    if(wantLong) {
      ok = CheckHTFTrendUP();
    } else {
      ok = CheckHTFTrendDOWN();
    }
    if(ok) {
      passed++;
    } else {
      if(InpDebugFilters) {
        string htfStr = EnumToString(InpHTF);
        Print("Filter fail: HTF Trend (", htfStr, ")");
      }
    }
  }

  if(InpUseVolumeFilter) {
    available++;
    ok = CheckVolumeFilter();
    if(ok) {
      passed++;
    } else {
      if(InpDebugFilters) {
        string multStr = DoubleToString(InpVolumeMultiplier, 2);
        Print("Filter fail: Volume (mult=", multStr, ")");
      }
    }
  }

  if(available == 0) return true;

  int required = InpMinFiltersToPass;
  if(required < 0) required = 0;
  if(required > available) required = available;

  bool okAll = passed >= required;
  if(InpDebugFilters) {
    if(!okAll) {
      Print("Filters summary: passed=", passed, "/", available, " required=", required);
    }
  }
  return okAll;
}

void ManageTrailingStops() {
  if(!InpUseTrailingStop) return;
  
  int i;
  for(i = PositionsTotal() - 1; i >= 0; i--) {
    ulong ticket = PositionGetTicket(i);
    if(ticket == 0) continue;
    if(!PositionSelectByTicket(ticket)) continue;
    if(PositionGetString(POSITION_SYMBOL) != _Symbol || 
       PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
    
    double posOpen = PositionGetDouble(POSITION_PRICE_OPEN);
    double posSL = PositionGetDouble(POSITION_SL);
    double posTP = PositionGetDouble(POSITION_TP);
    ENUM_POSITION_TYPE posType = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
    
    double ask = 0, bid = 0;
    if(!GetTickInfo(ask, bid)) continue;
    
    double currentPrice = (posType == POSITION_TYPE_BUY ? bid : ask);
    double profit = (posType == POSITION_TYPE_BUY ? (currentPrice - posOpen) : (posOpen - currentPrice));
    double risk = MathAbs(posOpen - posSL);
    
    if(risk <= 0) continue;
    double profitPct = (profit / risk) * 100.0;
    
    if(profitPct >= InpTrailingStopPct) {
      double newSL = 0.0;
      if(posType == POSITION_TYPE_BUY) {
        newSL = currentPrice - (risk * 0.5);
        if(newSL > posSL && newSL < currentPrice) {
          MqlTradeRequest r;
          MqlTradeResult s;
          ZeroMemory(r); ZeroMemory(s);
          r.action = TRADE_ACTION_SLTP;
          r.position = ticket;
          r.symbol = _Symbol;
          r.sl = newSL;
          r.tp = posTP;
          if(OrderSend(r, s)) {
            Print("Trailing stop updated ticket=", ticket);
          }
        }
      } else {
        newSL = currentPrice + (risk * 0.5);
        if(newSL < posSL && newSL > currentPrice) {
          MqlTradeRequest r;
          MqlTradeResult s;
          ZeroMemory(r); ZeroMemory(s);
          r.action = TRADE_ACTION_SLTP;
          r.position = ticket;
          r.symbol = _Symbol;
          r.sl = newSL;
          r.tp = posTP;
          if(OrderSend(r, s)) {
            Print("Trailing stop updated ticket=", ticket);
          }
        }
      }
    }
  }
}

bool SpreadOk() {
  if(InpMaxSpreadPoints <= 0.0) return true;
  double s = (SymbolInfoDouble(_Symbol, SYMBOL_ASK) - SymbolInfoDouble(_Symbol, SYMBOL_BID)) / _Point;
  return s <= InpMaxSpreadPoints;
}

int CountOpen() {
  int c = 0;
  int i;
  for(i = 0; i < PositionsTotal(); i++) {
    ulong ticket = PositionGetTicket(i);
    if(ticket==0) continue;
    if(PositionSelectByTicket(ticket)) {
      if(PositionGetInteger(POSITION_MAGIC) == InpMagic && 
         PositionGetString(POSITION_SYMBOL) == _Symbol) {
        c++;
      }
    }
  }
  return c;
}

int CountOpenOrPending() {
  int c = CountOpen();
  int i;
  for(i = 0; i < OrdersTotal(); i++) {
    ulong ticket = OrderGetTicket(i);
    if(ticket > 0) {
      if(OrderSelect(ticket)) {
        if(OrderGetInteger(ORDER_MAGIC) == InpMagic && 
           OrderGetString(ORDER_SYMBOL) == _Symbol) {
          c++;
        }
      }
    }
  }
  return c;
}

bool GetTickInfo(double &ask, double &bid) {
  MqlTick t;
  if(!SymbolInfoTick(_Symbol, t)) return false;
  ask = t.ask;
  bid = t.bid;
  return true;
}

double CalcLotForRisk(double stopDist) {
  double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
  double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
  double volStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
  
  // Apply user-defined max lot size cap
  double effectiveMaxLot = MathMin(maxLot, InpMaxLotSize);
  
  if(InpUseFixedLot) {
    double fixed = NormalizeDouble(InpFixedLot, 2);
    fixed = MathMax(minLot, MathMin(effectiveMaxLot, MathFloor(fixed / volStep) * volStep));
    return NormalizeDouble(fixed, 2);
  }
  
  if(stopDist <= 0) return 0.0;
  
  double eq = AccountInfoDouble(ACCOUNT_EQUITY);
  if(eq <= 0) return 0.0;
  
  double risk = eq * InpRiskPct / 100.0;
  double tickValue = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
  double tickSize = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_SIZE);
  
  if(tickSize <= 0 || volStep <= 0) return 0.0;
  
  double ticks = stopDist / tickSize;
  double moneyPerLot = ticks * tickValue;
  if(moneyPerLot <= 0.0) return 0.0;
  
  double lots = risk / moneyPerLot;
  lots = MathFloor(lots / volStep) * volStep;
  lots = MathMax(minLot, MathMin(effectiveMaxLot, lots));  // Use effective max
  
  return NormalizeDouble(lots, 2);
}

void PlaceOrder(ENUM_ORDER_TYPE type, double sl, double tp, const string reason) {
  MqlTradeRequest req;
  MqlTradeResult res;
  ZeroMemory(req);
  ZeroMemory(res);
  
  req.action = TRADE_ACTION_DEAL;
  req.magic = InpMagic;
  req.symbol = _Symbol;
  req.type = type;
  
  double ask = 0, bid = 0;
  if(!GetTickInfo(ask, bid)) return;
  
  req.price = (type == ORDER_TYPE_BUY ? ask : bid);
  req.sl = sl;
  req.tp = tp;
  req.deviation = InpSlippagePoints;
  
  double stopDist = MathAbs(req.price - sl);
  double lots = CalcLotForRisk(stopDist);
  if(lots <= 0.0) return;
  
  // Validate volume against broker limits
  double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
  double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
  double volStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
  
  // Apply user-defined max lot size cap
  double effectiveMaxLot = MathMin(maxLot, InpMaxLotSize);
  
  lots = NormalizeDouble(lots, 2);
  
  // Cap at effective max
  if(lots > effectiveMaxLot) {
    lots = effectiveMaxLot;
    lots = MathFloor(lots / volStep) * volStep;
    lots = NormalizeDouble(lots, 2);
  }
  
  if(lots < minLot || lots > effectiveMaxLot) {
    Print("Invalid lot size: ", lots, " min=", minLot, " max=", effectiveMaxLot);
    return;
  }
  
  // Check volume step
  double remainder = MathMod(lots, volStep);
  if(remainder > 0.00001) {
    lots = MathFloor(lots / volStep) * volStep;
    lots = NormalizeDouble(lots, 2);
  }
  
  if(lots < minLot) return;
  if(lots > effectiveMaxLot) {
    Print("Lot size ", lots, " exceeds max limit ", effectiveMaxLot, " - reducing");
    lots = effectiveMaxLot;
    lots = MathFloor(lots / volStep) * volStep;
    lots = NormalizeDouble(lots, 2);
    if(lots < minLot) return;
  }
  
  req.volume = lots;
  
  if(!OrderSend(req, res)) {
    int err = GetLastError();
    if(err == 4756) {
      // Volume limit - don't spam, just silently skip
      // Consider reducing InpMaxLotSize or InpRiskPct
      return;
    }
    Print("OrderSend failed: ", err, " reason=", reason, " volume=", lots);
  } else {
    Print("Order sent ", (type == ORDER_TYPE_BUY ? "BUY" : "SELL"), " ", lots, 
          " SL=", DoubleToString(sl, _Digits), 
          " TP=", DoubleToString(tp, _Digits), 
          " reason=", reason);
  }
}

bool ManageTimeExit() {
  bool hasOpenPosition = false;
  bool closedSomething = false;
  int i;
  
  // First pass: close positions that exceeded hold time
  for(i = PositionsTotal() - 1; i >= 0; i--) {
    ulong ticket = PositionGetTicket(i);
    if(ticket == 0) continue;
    if(!PositionSelectByTicket(ticket)) continue;
    if(PositionGetString(POSITION_SYMBOL) != _Symbol || 
       PositionGetInteger(POSITION_MAGIC) != InpMagic) continue;
    
    hasOpenPosition = true;
    
    datetime ot = (datetime)PositionGetInteger(POSITION_TIME);
    int barsOpen = iBarShift(_Symbol, _Period, ot, true);
    if(barsOpen < 0) continue;
    
    if(barsOpen >= InpHoldBars) {
      double origVol = PositionGetDouble(POSITION_VOLUME);
      if(origVol <= 0) continue;
      
      ENUM_POSITION_TYPE pt = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      
      // Try to close full position first
      double vol = origVol;
      double minLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);
      double maxLot = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);
      double volStep = SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);
      double effectiveMaxLot = MathMin(maxLot, InpMaxLotSize);
      
      vol = NormalizeDouble(vol, 2);
      
      // If volume exceeds max, try partial close
      bool tryPartialClose = false;
      if(vol > effectiveMaxLot) {
        vol = effectiveMaxLot;
        vol = MathFloor(vol / volStep) * volStep;
        vol = NormalizeDouble(vol, 2);
        if(vol < minLot) {
          Print("Time exit: Cannot close - position too large (", origVol, ") and max lot (", effectiveMaxLot, ") too small");
          continue; // Skip this position, will try again next bar
        }
        tryPartialClose = true;
      }
      
      // Check volume step
      double remainder = MathMod(vol, volStep);
      if(remainder > 0.00001) {
        vol = MathFloor(vol / volStep) * volStep;
        vol = NormalizeDouble(vol, 2);
      }
      
      if(vol < minLot) continue;
      
      double ask = 0, bid = 0;
      if(!GetTickInfo(ask, bid)) continue;
      
      // Use OrderSend with position ticket to close (works for both full and partial)
      bool closed = false;
      MqlTradeRequest r;
      MqlTradeResult s;
      ZeroMemory(r);
      ZeroMemory(s);
      
      r.action = TRADE_ACTION_DEAL;
      r.symbol = _Symbol;
      r.magic = InpMagic;
      r.deviation = InpSlippagePoints;
      r.position = ticket;  // Close specific position
      r.volume = vol;
      r.price = (pt == POSITION_TYPE_BUY ? bid : ask);
      r.type = (pt == POSITION_TYPE_BUY ? ORDER_TYPE_SELL : ORDER_TYPE_BUY);
      
      if(!OrderSend(r, s)) {
        int err = GetLastError();
        if(err == 4756) {
          // Volume limit - try smaller partial close
          if(!tryPartialClose && vol > minLot) {
            // Reduce by 50% and try again
            vol = MathMax(minLot, MathFloor((vol * 0.5) / volStep) * volStep);
            vol = NormalizeDouble(vol, 2);
            r.volume = vol;
            
            if(OrderSend(r, s)) {
              Print("Time exit: Partial close succeeded (", vol, " of ", origVol, ")");
              closedSomething = true;
              closed = true;
              continue; // Try next position
            }
          }
          Print("Time exit: Volume limit (4756) - cannot close position ticket=", ticket, " volume=", origVol, " bars open=", barsOpen);
          continue; // Will retry next bar
        }
        Print("Time exit failed: ", err, " ticket=", ticket, " volume=", vol, " reason=", s.comment, " bars open=", barsOpen);
        continue; // Will retry next bar
      } else {
        Print("Time exit closed position ticket=", ticket, " volume=", vol, (tryPartialClose ? " (partial)" : " (full)"), " bars open=", barsOpen);
        closedSomething = true;
        closed = true;
        // Continue checking other positions
      }
      
      if(!closed) {
        // If all close attempts failed, will retry on next bar
        Print("Time exit: All close methods failed for ticket=", ticket, " volume=", origVol, " - will retry next bar");
      }
    }
  }
  
  // Return true if there are still open positions (prevent new trades)
  return hasOpenPosition && !closedSomething;
}

void OnTick() {
  // Manage trailing stops on every tick (not just new bars)
  if(CountOpen() > 0) {
    ManageTrailingStops();
    
    // Always check for time exits first on every tick
    bool stillHasOpen = ManageTimeExit();
    // If ManageTimeExit returns true, positions exist but couldn't be closed
    // Prevent new trades until they're closed
    if(stillHasOpen) {
      if(IsNewBar()) {
        Print("Warning: Open positions exist but time exit failed - blocking new trades until closed");
      }
      return; // Don't open new trades if old ones couldn't be closed
    }
  }
  
  // Only check for new signals on new bars
  if(!IsNewBar()) return;
  
  if(!SpreadOk()) {
    ManageTimeExit();
    return;
  }
  
  // Final check - ensure no open positions before allowing new trades
  if(CountOpenOrPending() > 0) {
    ManageTimeExit();
    return;
  }

  Bar prev;
  ReadBar(1, prev);
  Bar cur;
  ReadBar(0, cur);

  // Log when patterns are detected (for debugging)
  static int patternCount = 0;
  if(InpEnablePinBar) {
    bool bullPin = IsBullPin(prev);
    bool bearPin = IsBearPin(prev);
    if(bullPin || bearPin) {
      patternCount++;
      if(patternCount <= 10 || patternCount % 50 == 0) { // Log first 10, then every 50th
        Print("Pattern detected: ", (bullPin ? "BULL pin" : ""), (bearPin ? "BEAR pin" : ""), " at ", TimeToString(prev.time, TIME_DATE|TIME_MINUTES));
      }
    }
  }

  if(InpEnablePinBar) {
    if(IsBullPin(prev) && g_lastPinSignal != prev.time) {
      // Soft filter logic: require min number of passes
      if(!FiltersPass(true)) { return; }
      
      double sl = prev.low;
      double risk = cur.close - sl;
      if(risk > 0) {
        double tp = cur.close + (risk * InpPinBarRR);
        Print("Bull pin signal ACCEPTED - Entry=", DoubleToString(cur.close, _Digits), " SL=", DoubleToString(sl, _Digits), " TP=", DoubleToString(tp, _Digits), " R:R=", InpPinBarRR);
        PlaceOrder(ORDER_TYPE_BUY, sl, tp, "bull_pin");
        g_lastPinSignal = prev.time;
        return;
      }
    } else if(IsBearPin(prev) && g_lastPinSignal != prev.time) {
      if(!FiltersPass(false)) { return; }
      
      double sl = prev.high;
      double risk = sl - cur.close;
      if(risk > 0) {
        double tp = cur.close - (risk * InpPinBarRR);
        Print("Bear pin signal ACCEPTED - Entry=", DoubleToString(cur.close, _Digits), " SL=", DoubleToString(sl, _Digits), " TP=", DoubleToString(tp, _Digits), " R:R=", InpPinBarRR);
        PlaceOrder(ORDER_TYPE_SELL, sl, tp, "bear_pin");
        g_lastPinSignal = prev.time;
        return;
      }
    }
  }

  if(InpEnableBreakout) {
    double hh = DonchianHigh(InpDonchianPeriod);
    double ll = DonchianLow(InpDonchianPeriod);
    double atr = ComputeATR(InpATRPeriod);
    
    if(atr > 0 && g_lastBreakoutSignal != prev.time) {
      if(prev.close > hh) {
        if(!FiltersPass(true)) { return; }
        
        double sl = cur.close - InpATRMult * atr;
        double risk = cur.close - sl;
        double tp = cur.close + (risk * InpBreakoutRR);
        Print("Breakout UP signal ACCEPTED - Price=", DoubleToString(prev.close, _Digits), " > HH=", DoubleToString(hh, _Digits), " SL=", DoubleToString(sl, _Digits), " TP=", DoubleToString(tp, _Digits), " R:R=", InpBreakoutRR);
        PlaceOrder(ORDER_TYPE_BUY, sl, tp, "donchian_up");
        g_lastBreakoutSignal = prev.time;
        return;
      }
      if(prev.close < ll) {
        if(!FiltersPass(false)) { return; }
        
        double sl = cur.close + InpATRMult * atr;
        double risk = sl - cur.close;
        double tp = cur.close - (risk * InpBreakoutRR);
        Print("Breakout DN signal ACCEPTED - Price=", DoubleToString(prev.close, _Digits), " < LL=", DoubleToString(ll, _Digits), " SL=", DoubleToString(sl, _Digits), " TP=", DoubleToString(tp, _Digits), " R:R=", InpBreakoutRR);
        PlaceOrder(ORDER_TYPE_SELL, sl, tp, "donchian_dn");
        g_lastBreakoutSignal = prev.time;
        return;
      }
    }
  }
}
