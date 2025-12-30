#property strict
#property description "Pin-bar continuation + Donchian ATR breakout EA for synthetic index"
#property version   "1.00"

input bool   InpEnablePinBar      = true;
input bool   InpEnableBreakout    = true;
input int    InpDonchianPeriod    = 20;
input int    InpATRPeriod         = 14;
input double InpATRMult           = 1.5;
input int    InpHoldBars          = 3;
input double InpRiskPct           = 1.0;
input bool   InpUseFixedLot       = false;
input double InpFixedLot          = 0.10;
input double InpMaxSpreadPoints   = 0.0;
input int    InpSlippagePoints    = 5;
input long   InpMagic             = 990099;

datetime g_lastBarTime = 0;
datetime g_lastPinSignal = 0;
datetime g_lastBreakoutSignal = 0;

bool IsNewBar() { datetime ct = iTime(_Symbol, _Period, 0); if (ct != g_lastBarTime) { g_lastBarTime = ct; return true; } return false; }

struct Bar { double open, high, low, close; datetime time; };
void ReadBar(int idx, Bar &b) { b.open=iOpen(_Symbol,_Period,idx); b.high=iHigh(_Symbol,_Period,idx); b.low=iLow(_Symbol,_Period,idx); b.close=iClose(_Symbol,_Period,idx); b.time=iTime(_Symbol,_Period,idx);} 

bool IsBullPin(const Bar &b){ double body=MathAbs(b.close-b.open); double upper=b.high-MathMax(b.open,b.close); double lower=MathMin(b.open,b.close)-b.low; return (lower>body*2.0 && upper<body && b.close>b.open);} 
bool IsBearPin(const Bar &b){ double body=MathAbs(b.close-b.open); double upper=b.high-MathMax(b.open,b.close); double lower=MathMin(b.open,b.close)-b.low; return (upper>body*2.0 && lower<body && b.close<b.open);} 

double DonchianHigh(int p){ double hh=-DBL_MAX; for(int i=1;i<=p;i++) hh=MathMax(hh,iHigh(_Symbol,_Period,i)); return hh; } 
double DonchianLow(int p){ double ll= DBL_MAX; for(int i=1;i<=p;i++) ll=MathMin(ll,iLow(_Symbol,_Period,i)); return ll; } 

double ComputeATR(int p){ double trSum=0.0; int n=MathMin(p,Bars(_Symbol,_Period)); for(int i=n;i>=1;i--){ double h=iHigh(_Symbol,_Period,i); double l=iLow(_Symbol,_Period,i); double pc=iClose(_Symbol,_Period,i+1); double tr=MathMax(h-l,MathMax(MathAbs(h-pc),MathAbs(l-pc))); trSum+=tr;} if(n<=0) return 0.0; return trSum/n; } 

bool SpreadOk(){ if(InpMaxSpreadPoints<=0.0) return true; double s=(SymbolInfoDouble(_Symbol,SYMBOL_ASK)-SymbolInfoDouble(_Symbol,SYMBOL_BID))/_Point; return s<=InpMaxSpreadPoints; }
int CountOpen(){ int c=0; for(int i=0;i<PositionsTotal();i++){ if(PositionSelectByIndex(i)){ if(PositionGetInteger(POSITION_MAGIC)==InpMagic && PositionGetString(POSITION_SYMBOL)==_Symbol) c++; } } return c; }

int CountOpenOrPending(){
  int c = CountOpen();
  for(int i=0;i<OrdersTotal();i++){
    if(OrderSelect(i, SELECT_BY_INDEX)){
      if(OrderGetInteger(ORDER_MAGIC)==InpMagic && OrderGetString(ORDER_SYMBOL)==_Symbol) c++;
    }
  }
  return c;
}

bool GetTickInfo(double &ask,double &bid){ MqlTick t; if(!SymbolInfoTick(_Symbol,t)) return false; ask=t.ask; bid=t.bid; return true; }

double CalcLotForRisk(double stopDist){ if(InpUseFixedLot) return InpFixedLot; if(stopDist<=0) return 0.0; double eq=AccountInfoDouble(ACCOUNT_EQUITY); double risk=eq*InpRiskPct/100.0; double tickValue=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_VALUE); double tickSize=SymbolInfoDouble(_Symbol,SYMBOL_TRADE_TICK_SIZE); double volStep=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_STEP); double minLot=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MIN); double maxLot=SymbolInfoDouble(_Symbol,SYMBOL_VOLUME_MAX); double ticks=stopDist/tickSize; double moneyPerLot=ticks*tickValue; if(moneyPerLot<=0.0) return 0.0; double lots=risk/moneyPerLot; lots=MathMax(minLot,MathMin(maxLot,MathFloor(lots/volStep)*volStep)); return lots; }

void PlaceOrder(ENUM_ORDER_TYPE type,double sl,double tp,const string reason){ MqlTradeRequest r; MqlTradeResult s; ZeroMemory(r); ZeroMemory(s); r.action=TRADE_ACTION_DEAL; r.magic=InpMagic; r.symbol=_Symbol; r.type=type; double ask=0,bid=0; if(!GetTickInfo(ask,bid)) return; r.price=(type==ORDER_TYPE_BUY?ask:bid); r.sl=sl; r.tp=tp; r.deviation=InpSlippagePoints; double lots=CalcLotForRisk(MathAbs(r.price-sl)); if(lots<=0.0) return; r.volume=lots; if(!OrderSend(r,s)) Print("OrderSend failed:",GetLastError()," reason=",reason); else Print("Order sent ",(type==ORDER_TYPE_BUY?"BUY":"SELL")," ",lots," SL=",DoubleToString(sl,_Digits)," TP=",DoubleToString(tp,_Digits)," reason=",reason); }

void ManageTimeExit(){
  for(int i=PositionsTotal()-1;i>=0;i--){
    if(!PositionSelectByIndex(i)) continue;
    if(PositionGetString(POSITION_SYMBOL)!=_Symbol || PositionGetInteger(POSITION_MAGIC)!=InpMagic) continue;
    datetime ot=(datetime)PositionGetInteger(POSITION_TIME);
    int barsOpen = iBarShift(_Symbol,_Period, ot, true);
    if(barsOpen < 0) continue;
    if(barsOpen >= InpHoldBars){
      double vol=PositionGetDouble(POSITION_VOLUME);
      ENUM_POSITION_TYPE pt=(ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      MqlTradeRequest r; MqlTradeResult s; ZeroMemory(r); ZeroMemory(s);
      r.action=TRADE_ACTION_DEAL; r.symbol=_Symbol; r.magic=InpMagic; r.deviation=InpSlippagePoints; r.volume=vol;
      double ask=0,bid=0; if(!GetTickInfo(ask,bid)) return; r.price=(pt==POSITION_TYPE_BUY?bid:ask);
      r.type=(pt==POSITION_TYPE_BUY?ORDER_TYPE_SELL:ORDER_TYPE_BUY);
      if(!OrderSend(r,s)) Print("Time exit failed:",GetLastError()); else Print("Time exit closed position");
    }
  }
}

void OnTick(){
  if(!IsNewBar()) return;
  if(!SpreadOk()){ ManageTimeExit(); return; }
  if(CountOpenOrPending()>0){ ManageTimeExit(); return; }

  Bar prev; ReadBar(1,prev); Bar cur; ReadBar(0,cur);

  if(InpEnablePinBar){
    if(IsBullPin(prev) && g_lastPinSignal != prev.time){
      double sl=prev.low; double risk=cur.close-sl; if(risk>0){ double tp=cur.close+risk; PlaceOrder(ORDER_TYPE_BUY,sl,tp,"bull_pin"); g_lastPinSignal = prev.time; ManageTimeExit(); return; }
    } else if(IsBearPin(prev) && g_lastPinSignal != prev.time){
      double sl=prev.high; double risk=sl-cur.close; if(risk>0){ double tp=cur.close-risk; PlaceOrder(ORDER_TYPE_SELL,sl,tp,"bear_pin"); g_lastPinSignal = prev.time; ManageTimeExit(); return; }
    }
  }

  if(InpEnableBreakout){
    double hh=DonchianHigh(InpDonchianPeriod); double ll=DonchianLow(InpDonchianPeriod); double atr=ComputeATR(InpATRPeriod);
    if(atr>0 && g_lastBreakoutSignal != prev.time){
      if(prev.close>hh){ double sl=cur.close-InpATRMult*atr; PlaceOrder(ORDER_TYPE_BUY,sl,0.0,"donchian_up"); g_lastBreakoutSignal = prev.time; ManageTimeExit(); return; }
      if(prev.close<ll){ double sl=cur.close+InpATRMult*atr; PlaceOrder(ORDER_TYPE_SELL,sl,0.0,"donchian_dn"); g_lastBreakoutSignal = prev.time; ManageTimeExit(); return; }
    }
  }

  ManageTimeExit();
}


