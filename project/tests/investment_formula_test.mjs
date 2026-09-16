import fs from 'fs';
import vm from 'vm';
import ts from '../apps/investment-calculator/node_modules/typescript/lib/typescript.js';

const f=new URL('../apps/investment-calculator/src/App.tsx', import.meta.url);
const src=fs.readFileSync(f,'utf8');
const sf=ts.createSourceFile(f.pathname,src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const names=new Set(['calculateYearlyData','calculateGoalSeek','calculateGoalProjection','formatCompact']);
const printer=ts.createPrinter();
let code='';
for(const st of sf.statements){
  if(ts.isFunctionDeclaration(st)&&st.name&&names.has(st.name.text))
    code+=printer.printNode(ts.EmitHint.Unspecified,st,sf)+'\n';
}
const js=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const ctx={Math}; vm.createContext(ctx);
vm.runInContext(js+';this.fns={calculateYearlyData,calculateGoalSeek,calculateGoalProjection,formatCompact};',ctx);
const {calculateYearlyData,calculateGoalSeek,calculateGoalProjection}=ctx.fns;
let ok=true;
function check(name,cond,detail=''){console.log(`[${cond?'PASS':'FAIL'}] ${name}${detail?`: ${detail}`:''}`); if(!cond) ok=false;}
let d=calculateYearlyData({initialAmount:10000,monthlyDeposit:500,annualRate:0,years:2,inflationRate:0,adjustForInflation:false});
check('Investment 0% year 1 exact',d[0].portfolioValue===16000,JSON.stringify(d[0]));
check('Investment 0% year 2 exact',d[1].portfolioValue===22000,JSON.stringify(d[1]));
d=calculateYearlyData({initialAmount:10000,monthlyDeposit:0,annualRate:12,years:1,inflationRate:0,adjustForInflation:false});
const expected=Math.round(10000*Math.pow(1.01,12));
check('Investment monthly compounding',d[0].portfolioValue===expected,`${d[0].portfolioValue} vs ${expected}`);
let g=calculateGoalSeek({targetAmount:12000,targetYear:1,initialAmount:0,annualRate:0});
check('Goal seek at 0% return',Math.abs(g.monthlyPayment-1000)<1e-9,String(g.monthlyPayment));
g=calculateGoalSeek({targetAmount:10000,targetYear:10,initialAmount:10000,annualRate:0});
check('Already-reached goal requires no deposit',g.isAlreadyReached&&g.monthlyPayment===0,JSON.stringify(g));
g=calculateGoalSeek({targetAmount:100000,targetYear:10,initialAmount:10000,annualRate:8});
const p=calculateGoalProjection({targetAmount:100000,targetYear:10,initialAmount:10000,annualRate:8},g.monthlyPayment);
check('Goal projection reaches target',Math.abs(p.at(-1).portfolioValue-100000)<=1,String(p.at(-1).portfolioValue));
console.log(`\nINVESTMENT FORMULA RESULT: ${ok?'ALL CHECKS PASSED':'FAILURES FOUND'}`);
process.exit(ok?0:1);
