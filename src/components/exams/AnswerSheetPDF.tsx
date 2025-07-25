'use client';
import React, { useEffect, useState } from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import type { Exam } from '@/types';
import QRCode from 'qrcode';

// Font registration is handled by the parent component (`ExamsPage`)
// before this component is ever rendered.

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN_X = 40;
const MARGIN_Y = 40;

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 10,
    padding: MARGIN_X,
    backgroundColor: '#fff',
    color: '#000',
    position: 'relative',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
  },
  studentName: {
    marginTop: 15,
    borderBottom: '1px solid #000',
    width: '70%',
    alignSelf: 'center',
    paddingBottom: 2,
  },
  anchor: {
    position: 'absolute',
    width: 56, // ~20mm
    height: 56,
    backgroundColor: 'black',
  },
  anchorTL: { top: MARGIN_Y / 2, left: MARGIN_X / 2 },
  anchorTR: { top: MARGIN_Y / 2, right: MARGIN_X / 2 },
  anchorBL: { bottom: MARGIN_Y / 2, left: MARGIN_X / 2 },
  anchorBR: { bottom: MARGIN_Y / 2, right: MARGIN_X / 2 },
  questionSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 3,
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  questionIndex: {
    width: 25,
    fontWeight: 'bold',
  },
  bubblesContainer: {
    flexDirection: 'row',
  },
  bubble: {
    width: 22, // ~8mm
    height: 22,
    borderRadius: 11,
    border: '1px solid #000',
    marginRight: 14, // ~5mm
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleLabel: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  discursiveContainer: {
    marginBottom: 15,
  },
  discursiveBox: {
    border: '1px solid #ccc',
    minHeight: 85, // ~3cm
    padding: 5,
  },
  numericContainer: {
    marginBottom: 15,
  },
  numericBox: {
    border: '1px solid #ccc',
    height: 30,
    padding: 5,
  },
  footer: {
    position: 'absolute',
    bottom: MARGIN_Y,
    left: MARGIN_X,
    right: MARGIN_X,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    fontSize: 8,
  },
  qrCode: {
    width: 113, // ~40mm
    height: 113,
  },
  pageNumber: {
    textAlign: 'center',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    margin: 20,
  }
});

interface AnswerSheetPDFProps {
  exam: Exam;
}

const AnswerSheetPDF: React.FC<AnswerSheetPDFProps> = ({ exam }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  // Hard guard against undefined/invalid props before any hooks
  if (!exam || !exam.id || !Array.isArray(exam.questions) || exam.questions.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
        console.error("[AnswerSheetPDF] Invalid or empty exam prop received:", exam);
    }
    // Return a valid but empty Document to prevent the renderer from crashing.
    return (
      <Document>
        <Page size="A4" style={styles.page}>
          <Text style={styles.errorText}>Erro: Dados da prova inválidos ou prova incompleta. Não foi possível gerar o PDF.</Text>
        </Page>
      </Document>
    );
  }

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const qrData = JSON.stringify({
          examId: exam.id,
          studentId: '<PLACEHOLDER>', // This should be replaced with real student ID in a full implementation
        });
        const url = await QRCode.toDataURL(qrData);
        setQrCodeUrl(url);
      } catch (err) {
        console.error('Failed to generate QR code', err);
      }
    };
    generateQRCode();
  }, [exam.id]);

  const objectiveQuestions = exam.questions.filter(q => q.type === 'objective');
  const otherQuestions = exam.questions.filter(q => q.type !== 'objective');
  const examDate = exam.date ? new Date(exam.date).toLocaleDateString('pt-BR') : 'Data não definida';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Anchors for OMR */}
        <View style={{ ...styles.anchor, ...styles.anchorTL }} fixed />
        <View style={{ ...styles.anchor, ...styles.anchorTR }} fixed />
        <View style={{ ...styles.anchor, ...styles.anchorBL }} fixed />
        <View style={{ ...styles.anchor, ...styles.anchorBR }} fixed />

        {/* Header */}
        <View style={styles.header} fixed>
          <Text style={styles.title}>{exam.title}</Text>
          <Text style={styles.subtitle}>{exam.subject}</Text>
          <Text style={styles.subtitle}>Data: {examDate}</Text>
          <Text style={styles.studentName}>Nome do Aluno:</Text>
        </View>

        {/* Objective Questions Section */}
        {objectiveQuestions.length > 0 && (
          <View style={styles.questionSection}>
            <Text style={styles.sectionTitle}>Questões Objetivas</Text>
            {objectiveQuestions.map((q, index) => {
              const questionNumber = exam.questions.findIndex(eq => eq.id === q.id) + 1;
              return (
                <View key={q.id} style={styles.objectiveRow}>
                  <Text style={styles.questionIndex}>{questionNumber}.</Text>
                  <View style={styles.bubblesContainer}>
                    {['A', 'B', 'C', 'D', 'E'].map(option => (
                      <View key={option} style={styles.bubble}>
                        <Text style={styles.bubbleLabel}>{option}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Other Questions Section */}
        {otherQuestions.length > 0 && (
           <View style={styles.questionSection} break={objectiveQuestions.length > 25}>
            <Text style={styles.sectionTitle}>Questões Dissertativas / Numéricas</Text>
             {otherQuestions.map((q) => {
              const questionNumber = exam.questions.findIndex(eq => eq.id === q.id) + 1;
              return q.type === 'discursive' ? (
                <View key={q.id} style={styles.discursiveContainer}>
                   <Text style={styles.questionIndex}>{questionNumber}.</Text>
                   <View style={styles.discursiveBox} />
                </View>
              ) : (
                <View key={q.id} style={styles.numericContainer}>
                    <Text style={styles.questionIndex}>{questionNumber}.</Text>
                    <View style={styles.numericBox} />
                </View>
              );
            })}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          {qrCodeUrl && <Image src={qrCodeUrl} style={styles.qrCode} />}
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => (
            `${pageNumber} / ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};

export default AnswerSheetPDF;
