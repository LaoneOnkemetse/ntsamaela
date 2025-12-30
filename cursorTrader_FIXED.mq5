// Fixed cursorTrader.mq5 - Common fixes for compilation errors
// Replace your problematic sections with these patterns:

// COMMON FIX #1: Loop variable declaration
// WRONG:  for(i=0; i<n; i++)
// CORRECT: for(int i=0; i<n; i++)

// COMMON FIX #2: PositionSelectByIndex usage
// Line 36 fix example:
int CountOpen(){
  int c=0;
  for(int i=0; i<PositionsTotal(); i++){  // <-- Added 'int' before 'i'
    if(PositionSelectByIndex(i)){          // <-- Correct function
      if(PositionGetInteger(POSITION_MAGIC)==InpMagic && 
         PositionGetString(POSITION_SYMBOL)==_Symbol) c++;
    }
  }
  return c;
}

// COMMON FIX #3: OrderSelect usage
// Line 41 fix example:
int CountPending(){
  int c=0;
  for(int i=0; i<OrdersTotal(); i++){      // <-- Added 'int' before 'i'
    ulong ticket = OrderGetTicket(i);      // <-- Get ticket first
    if(OrderSelect(ticket)){              // <-- Correct: OrderSelect(ticket) not OrderSelect(i)
      if(OrderGetInteger(ORDER_MAGIC)==InpMagic && 
         OrderGetString(ORDER_SYMBOL)==_Symbol) c++;
    }
  }
  return c;
}

// COMMON FIX #4: iBarShift parameters
// Line 56 fix example:
void ManageTimeExit(){
  for(int i=PositionsTotal()-1; i>=0; i--){  // <-- Added 'int' before 'i'
    if(!PositionSelectByIndex(i)) continue;
    if(PositionGetString(POSITION_SYMBOL)!=_Symbol || 
       PositionGetInteger(POSITION_MAGIC)!=InpMagic) continue;
    datetime ot = (datetime)PositionGetInteger(POSITION_TIME);
    int barsOpen = iBarShift(_Symbol, _Period, ot, true);  // <-- Correct parameters: symbol, period, time, exact
    if(barsOpen < 0) continue;
    if(barsOpen >= InpHoldBars){
      // Close position code...
    }
  }
}

// TYPICAL MQL5 CORRECTIONS:
// 1. Always declare loop variables: for(int i=...)
// 2. PositionSelectByIndex(i) - correct
// 3. OrderSelect(ticket) needs ticket, not index
// 4. iBarShift(symbol, period, time, exact) - 4 parameters
// 5. PositionGetTicket() doesn't exist - use PositionSelectByIndex() instead
