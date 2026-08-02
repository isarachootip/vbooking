export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'vbooking / Timesheet & Lead Ingestion API Specification',
    version: '1.0.0',
    description: 'เอกสาร API และคู่มือการรับข้อมูลจากระบบภายนอก (Data Ingestion & Integration API) สำหรับระบบ vbooking',
    contact: {
      name: 'vbooking Development Team'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server'
    }
  ],
  tags: [
    { name: 'Leads Ingestion', description: 'รับข้อมูลลูกค้า/งานบริการจากระบบภายนอก (CRM, Line OA, Webform)' },
    { name: 'Tasks Management', description: 'จัดการและนำเข้างาน (Tasks)' },
    { name: 'Timesheets', description: 'บันทึกเวลาทำงาน' },
    { name: 'Webhooks', description: 'รับ Event อัตโนมัติจาก GitHub / GitLab' }
  ],
  paths: {
    '/api/leads': {
      get: {
        tags: ['Leads Ingestion'],
        summary: 'ดึงรายการ Leads ทั้งหมด',
        responses: {
          '200': {
            description: 'รายการ Leads ทั้งหมดในระบบ'
          }
        }
      },
      post: {
        tags: ['Leads Ingestion'],
        summary: 'รับข้อมูล Lead/งานซ่อม ใหม่จากระบบอื่น (Insert Data)',
        description: 'ยิงข้อมูล JSON Payload เพื่อเพิ่ม Lead ใหม่ลงใน PostgreSQL Database',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['customer_name', 'job_type'],
                properties: {
                  id: { type: 'string', example: 'lead_1715000000000', description: 'Optional unique ID (ถ้าไม่ส่ง ระบบจะ auto generate)' },
                  customer_name: { type: 'string', example: 'คุณวิชัย ใจดี' },
                  customer_phone: { type: 'string', example: '081-234-5678' },
                  customer_address: { type: 'string', example: '99/1 ถ.สุขุมวิท กรุงเทพฯ' },
                  customer_latitude: { type: 'number', example: 13.7563 },
                  customer_longitude: { type: 'number', example: 100.5018 },
                  map_url: { type: 'string', example: 'https://maps.google.com/?q=13.7563,100.5018' },
                  job_type: { type: 'string', example: 'รีโนเวทห้องครัว' },
                  notes: { type: 'string', example: 'สนใจประเมินราคาด่วนจากหน้าเว็บ Contact Us' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'บันทึกสำเร็จ ตอบกลับ object ของ lead ที่ถูกสร้าง',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    customer_name: { type: 'string' },
                    status: { type: 'string', example: 'New' },
                    created_at: { type: 'string' }
                  }
                }
              }
            }
          },
          '500': {
            description: 'Server error'
          }
        }
      }
    },
    '/api/tasks': {
      post: {
        tags: ['Tasks Management'],
        summary: 'เพิ่ม Task งานใหม่เข้าสู่โครงการ',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['projectId', 'title'],
                properties: {
                  projectId: { type: 'string', example: 'p1' },
                  assigneeId: { type: 'string', example: 'u2' },
                  title: { type: 'string', example: 'ติดตั้งระบบไฟห้องครัว' },
                  description: { type: 'string', example: 'เดินสายไฟและติดตั้งปลั๊กไฟ 4 จุด' },
                  status: { type: 'string', example: 'To Do' },
                  priority: { type: 'string', example: 'High' },
                  estimatedHours: { type: 'number', example: 8 }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'สร้าง task สำเร็จ'
          }
        }
      }
    },
    '/api/timesheets': {
      post: {
        tags: ['Timesheets'],
        summary: 'บันทึก Timesheet ลงเวลาทำงาน',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'projectId', 'date', 'hours'],
                properties: {
                  userId: { type: 'string', example: 'u2' },
                  projectId: { type: 'string', example: 'p1' },
                  taskId: { type: 'string', example: 't3' },
                  date: { type: 'string', example: '2026-08-02' },
                  hours: { type: 'number', example: 7.5 },
                  description: { type: 'string', example: 'เข้างานสกัดผนังและเดินสายไฟ' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'บันทึก timesheet สำเร็จ'
          }
        }
      }
    },
    '/api/webhooks/github': {
      post: {
        tags: ['Webhooks'],
        summary: 'GitHub Webhook Ingestion Endpoint',
        description: 'รับ event commit/push จาก GitHub โดยอัตโนมัติเมื่อมีการ push code ที่ระบุ Task ID เช่น #t123',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  commits: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        message: { type: 'string', example: 'Fix login bug #t1' },
                        author: { type: 'object' },
                        timestamp: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Webhook processed'
          }
        }
      }
    }
  }
};
