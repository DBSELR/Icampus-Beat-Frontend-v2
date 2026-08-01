const fs = require('fs');
const file = 'd:/Icampus_Beat/Icampus-Beat-Front/src/components/ExamRegistrations.jsx';
let content = fs.readFileSync(file, 'utf8');

const sems = [
  { num: 1, label: 'I' },
  { num: 2, label: 'II' },
  { num: 3, label: 'III' },
  { num: 4, label: 'IV' },
  { num: 5, label: 'V' },
  { num: 6, label: 'VI' },
  { num: 7, label: 'VII' },
  { num: 8, label: 'VIII' }
];

let replacement = '              <div className={styles.semesterGrid}>\n';

for (let sem of sems) {
  replacement += `                {/* Semester ${sem.label} */}
                <div className={styles.semesterSection}>
                  <label className={styles.listBoxLabel}>Semester ${sem.label} Papers</label>
                  <div className={styles.semesterFeeRow}>
                    <span className={styles.semesterFee} title={\`Fee for Semester ${sem.label}: \${semesterFees.sem${sem.num}}\`}>
                      {semesterFees.sem${sem.num} || '---'}
                    </span>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={allChecked.sem${sem.num}}
                        onChange={async () => {
                          try {
                            await handleAllCheckboxChange('sem${sem.num}');
                          } catch (error) {
                            console.error('Error in handleAllCheckboxChange:', error);
                          }
                        }}
                        className={styles.checkbox}
                      />
                      All
                    </label>
                  </div>
                  <div className={styles.checkboxListContainer}>
                    {semesterPapers.sem${sem.num}.map((paper, index) => {
                      const isSupply = paper.regsup === 'SUP';
                      const isRegistered = paper.regd === true || paper.regd === 'true' || paper.regd === 1 || paper.regd === '1' || 
                                         paper.REGD === true || paper.REGD === 'true' || paper.REGD === 1 || paper.REGD === '1';
                      const isChecked = selectedPapersBySem.sem${sem.num}.includes(paper.pcode) || isRegistered;
                      
                      let textClass = styles.subjectText;
                      if (isRegistered) textClass += \` \${styles.registered}\`;
                      else if (isSupply) textClass += \` \${styles.supply}\`;

                      return (
                        <label key={index} className={styles.checkboxItem}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isRegistered}
                            onChange={async (e) => {
                              try {
                                const checked = e.target.checked;
                                let newSelected = [...selectedPapersBySem.sem${sem.num}];
                                if (checked) {
                                  if (!newSelected.includes(paper.pcode)) newSelected.push(paper.pcode);
                                } else {
                                  newSelected = newSelected.filter(code => code !== paper.pcode);
                                }
                                await handlePaperSelection('sem${sem.num}', newSelected);
                              } catch (error) {
                                console.error('Error in handlePaperSelection:', error);
                              }
                            }}
                          />
                          <span className={textClass}>
                            {paper.pcode} - {paper.pname}
                          </span>
                        </label>
                      );
                    })}
                    {semesterPapers.sem${sem.num}.length === 0 && (
                      <div className={styles.subjectText} style={{ padding: '4px 6px', color: '#94a3b8' }}>
                        No papers available
                      </div>
                    )}
                  </div>
                </div>\n`;
}

replacement += '              </div>';

const lines = content.split('\n');
let startIndex = -1;
let endIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{/* Semester Papers Grid */}')) {
    startIndex = i + 1; // start of div className={styles.semesterGrid}
  }
  if (lines[i].includes('{/* Right Label Column - Semesters II, IV, VI, VIII - Removed */}')) {
    endIndex = i + 1; // line containing </div> that closes semesterGrid
  }
}

if (startIndex !== -1 && endIndex !== -1) {
  lines.splice(startIndex, endIndex - startIndex + 1, replacement);
  fs.writeFileSync(file, lines.join('\n'));
  console.log('Successfully replaced semesterGrid!');
} else {
  console.log('Failed to find boundaries: start=', startIndex, ' end=', endIndex);
}
