// JavaScript port of the pinned upstream advisory content rules. MIT, virgiliojr94.
// Original: vendor/book-to-skill/tools/scan_generated_skill.py. The browser also
// runs the original Python validator and scanner before exposing agent exports.
import {sanitizeSource} from './upstream-sanitize.mjs';
const rules=[
 ['prompt.ignore_previous',/\bignore\s+(?:(?:all|any|the)\s+)?(?:previous|prior)\s+(?:instructions?|prompts?|rules?|messages?)\b/i],
 ['prompt.disregard_system',/\bdisregard\s+(?:the\s+)?(?:system|developer)\b/i],
 ['prompt.role_reassignment',/\byou\s+are\s+now\b/i],
 ['prompt.fake_system_prefix',/^\s*(?:[-*]\s*)?(?:system|developer)\s*:/i],
 ['prompt.system_tag',/<\s*\/?\s*system\b[^>]*>/i],
 ['prompt.chat_template_tag',/<\|\s*im_start\s*\|>|\[\s*INST\s*\]/i],
 ['prompt.tool_call_tag',/<\|?\s*\/?\s*tool[_ -]?call\s*\|?>|\[\s*\/?\s*tool[_ -]?call\s*\]|\{\{\s*\/?\s*tool[_ -]?call\s*\}\}|"\s*tool[_ -]?call\s*"/i],
];
export function scanSkill(files){
 const findings=[];
 for(const [path,text] of Object.entries(files||{})){
  if(!path.startsWith('skill/')||!path.endsWith('.md'))continue;
  const lines=String(text).split(/\r?\n/);let frontmatterEnd=-1;
  if(lines[0]?.trim()==='---')frontmatterEnd=lines.findIndex((line,i)=>i>0&&line.trim()==='---');
  lines.forEach((line,i)=>{
   const add=rule_id=>findings.push({path:path.slice(6),line:i+1,rule_id});
   if(sanitizeSource(line)!==line)add('unicode.invisible');
   for(const [rule,pattern] of rules)if(pattern.test(line))add(rule);
   if(/\bexfiltrat(?:e|es|ed|ing|ion)\b/i.test(line)||(/\b(?:curl|wget|send|post|upload|transmit)\b|https?:\/\//i.test(line)&&/(?:\.env\b|\bbase64\b|\bsecrets?\b|\bcredentials?\b|\bapi[_ -]?keys?\b)/i.test(line)))add('tool.exfiltration_shape');
   if(i>0&&i<frontmatterEnd){
    if(/^\s*allowed-tools\s*:/i.test(line))add('frontmatter.allowed_tools');
    if(/^\s*disable-model-invocation\s*:\s*["']?(?:false|no|0)["']?\s*(?:#.*)?$/i.test(line))add('frontmatter.model_invocation_enabled');
   }
  });
 }
 return findings;
}
