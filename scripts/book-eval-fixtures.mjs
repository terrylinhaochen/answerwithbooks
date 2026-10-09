// Expected labels are evaluation data, never included in reviewer prompts.
export const reviewCases=[
 ['conditional-output',false,'1: They could, when they exerted themselves, make about twelve pounds of pins in a day.','The workshop routinely produced twelve pounds of pins every day.'],
 ['qualified-output',true,'1: They could, when they exerted themselves, make about twelve pounds of pins in a day.','Smith says that with exertion they could make about twelve pounds in a day.'],
 ['metadata-only',false,'1: The Wealth of Nations, by Adam Smith.','Labour determines the exchange value of commodities.'],
 ['missing-deadline',false,'1: An action without a date is incomplete: clarify its timing before committing to it.','Discard any action that lacks a deadline.'],
 ['lifetime-roles',false,'1: Some historical workers spent their whole lives at one operation. Repetition developed their dexterity.',{applicationBasis:'derived-application',steps:['Assign workers to permanent lifetime roles to obtain the productivity benefit.']}],
 ['cautious-application',true,'1: Repetition can develop dexterity. Switching operations consumes time.',{applicationBasis:'derived-application',steps:['Try grouping similar tasks temporarily and observe whether switching time falls.'],limits:'This is an application to test, not an author-prescribed staffing policy.'}],
 ['invented-source-instruction',false,'1: Repetition can develop dexterity. Switching operations consumes time.',{applicationBasis:'source-instruction',steps:['Use fixed quarterly rotations to optimize productivity.']}],
 ['transport-overgeneralization',false,'1: Water carriage historically made it possible to carry larger loads over longer distances at lower expense than carts on the routes described.',{applicationBasis:'derived-application',steps:['Always ship by water, because it is cheaper for every route.']}],
 ['wagon-group-mismatch',false,'1: One wagon carries four tons in six weeks. A ship carries 200 tons in that time, the same quantity as fifty wagons.', 'Fifty wagons carry four tons in the same time a ship carries 200 tons.'],
 ['wagon-group-correct',true,'1: One wagon carries four tons in six weeks. A ship carries 200 tons in that time, the same quantity as fifty wagons.', 'One ship carries as much as fifty wagons: 200 tons. Each wagon carries four tons.'],
 ['description-is-not-instruction',false,'1: Output increases through dexterity, saved switching time, and machines.',{applicationBasis:'source-instruction',steps:['Check each role for repetition, switching time and potential machinery improvements.']}],
 ['description-derived-checklist',true,'1: Output increases through dexterity, saved switching time, and machines.',{applicationBasis:'derived-application',steps:['Consider checking a process for repetition, switching time and potential machinery improvements.'],limits:'Suggested diagnostic application; the author does not prescribe this checklist.'}],
];

export const summaryEvidence=[{summary:'Smith argues that division of labour increases productivity through dexterity, reduced switching time and machine invention. Its extent is limited by the market, which historical water carriage could enlarge.',terms:[{term:'Division of labour',definition:'Specialization can increase productivity.',chapterIds:['ch01']}]}];
export const summaryCases=[
 {id:'shorter-candidate',expected:true,candidate:{thesis:'Smith links specialization to higher productivity.',glossary:[{term:'Division of labour',definition:'Specialization can increase productivity.',chapterIds:['ch01']}]}},
 {id:'source-detail-in-candidate',expected:true,candidate:{thesis:'Smith argues that water carriage could historically enlarge markets.',glossary:[]}},
 {id:'invented-obligation',expected:false,candidate:{thesis:'Smith requires every company to give each worker a lifetime assignment and always use water transport.',glossary:[]}},
];
